from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

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
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="این ایمیل قبلا ثبت شده است",
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
            "email",
            "first_name",
            "last_name",
            "phone",
            "national_id",
            "password",
        ]
        extra_kwargs = {
            "first_name": {"error_messages": {"blank": "نام نمی‌تواند خالی باشد"}},
            "last_name": {"error_messages": {"blank": "نام خانوادگی نمی‌تواند خالی باشد"}},
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

        new_email = validated_data.get("email")
        if new_email is not None and new_email != instance.email:
            instance.is_email_verified = False

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """Separate from UserSerializer on purpose: this one is for
    viewing/editing an existing account, not creating one — no
    password field, no UniqueValidators re-running against yourself
    (a user PATCHing their own profile with their own unchanged email
    shouldn't get an "already exists" error against their own record)."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "national_id",
            "is_phone_verified",
            "is_email_verified",
            "role",
        ]
        read_only_fields = ["id", "username", "is_phone_verified", "is_email_verified", "role"]


class UserProfileSerializer(serializers.ModelSerializer):
    """Used for viewing/editing an already-authenticated user's own
    data — deliberately has no password field. Password changes are a
    separate, more sensitive action and should go through their own
    endpoint (requiring the current password), not get bundled into a
    general "edit my profile" PATCH."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "national_id",
            "role",
            "is_phone_verified",
            "is_email_verified",
        ]
        read_only_fields = ["id", "username", "role", "is_phone_verified", "is_email_verified"]
