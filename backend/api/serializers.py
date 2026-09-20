from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import HeroSlide, Plan, UserSubscription, BillingPeriod

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    username = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="این نام کاربری قبلا ثبت شده است",
            )
        ]
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="این شماره تلفن قبلا ثبت شده است",
            )
        ],
    )
    national_id = serializers.CharField(
        required=False,
        allow_null=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="این کد ملی قبلا ثبت شده است",
            )
        ],
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "phone",
            "national_id",
            "password",
        ]
        extra_kwargs = {
            "first_name": {"error_messages": {"blank": "نام نمی‌تواند خالی باشد"}},
            "last_name": {
                "error_messages": {"blank": "نام خانوادگی نمی‌تواند خالی باشد"}
            },
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        # If phone is being changed to a different value, the old
        # verification no longer applies to the new number — reset it
        # so the user has to go through OTP verification again for
        # the new phone (see EditPhonePage.jsx's dedicated OTP flow).
        new_phone = validated_data.get("phone")
        if new_phone is not None and new_phone != instance.phone:
            instance.is_phone_verified = False

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """Used for viewing/editing an already-authenticated user's own
    data — deliberately has no password field. Password changes are a
    separate, more sensitive action and should go through their own
    endpoint (requiring the current password), not get bundled into a
    general "edit my profile" PATCH.

    birth_date/gender are both optional (blank on the model) and
    freely writable here — they're just extra profile info, not
    security-sensitive like phone/role, so no special validation
    beyond what DRF's ModelSerializer generates from the model fields
    themselves (valid date, valid choice)."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "phone",
            "national_id",
            "role",
            "avatar",
            "is_phone_verified",
            "birth_date",
            "gender",
        ]
        read_only_fields = ["id", "username", "role", "is_phone_verified"]


class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ["id", "image", "title", "subtitle", "link_url"]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_title = serializers.CharField(source="plan.title", read_only=True)
    plan_image = serializers.ImageField(source="plan.image", read_only=True)
    plan_features = serializers.CharField(source="plan.features", read_only=True)
    billing_period_label = serializers.CharField(
        source="get_billing_period_display", read_only=True
    )
    coupon_code = serializers.CharField(
        source="coupon.code", read_only=True, default=None
    )

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "plan_title",
            "plan_image",
            "plan_features",
            "billing_period_label",
            "price_at_purchase",
            "coupon_code",
            "status",
            "started_at",
            "ends_at",
            "created_at",
        ]


class PlanSerializer(serializers.ModelSerializer):
    periods = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = ["id", "image", "title", "features", "periods"]

    def _active_sale(self, obj):
        return next((s for s in obj.sales.all() if s.is_currently_active()), None)

    def get_periods(self, obj):
        sale = self._active_sale(obj)
        labels = {
            BillingPeriod.MONTHLY: "ماهانه",
            BillingPeriod.SIX_MONTHS: "۶ ماهه",
            BillingPeriod.YEARLY: "سالانه",
        }
        result = []
        for period, label in labels.items():
            price = obj.price_for_period(period)
            if price is None:
                continue
            discounted = sale.discounted_price(price) if sale else price
            sale_percent = sale.percent_off_display(price) if sale else None
            result.append(
                {
                    "period": period,
                    "label": label,
                    "price": price,
                    "discounted_price": discounted,
                    "sale_percent": sale_percent,
                }
            )
        return result
