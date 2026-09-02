"""
Custom Persian versions of Django's four built-in password validators.
Same validation logic as Django's originals (subclassed, not
reimplemented) — only the error messages and help text are overridden.
"""
from django.contrib.auth.password_validation import (
    MinimumLengthValidator,
    CommonPasswordValidator,
    NumericPasswordValidator,
    UserAttributeSimilarityValidator,
)
from django.core.exceptions import ValidationError

# Persian labels for the fields UserAttributeSimilarityValidator checks
# against — maps the model's field names to how they should read in a
# Persian error message.
FIELD_LABELS_FA = {
    "username": "نام کاربری",
    "email": "ایمیل",
    "first_name": "نام",
    "last_name": "نام خانوادگی",
    "phone": "شماره تلفن",
}


class FarsiMinimumLengthValidator(MinimumLengthValidator):
    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                f"رمز عبور باید حداقل {self.min_length} کاراکتر باشد",
                code="password_too_short",
            )

    def get_help_text(self):
        return f"رمز عبور باید حداقل {self.min_length} کاراکتر باشد"


class FarsiCommonPasswordValidator(CommonPasswordValidator):
    def validate(self, password, user=None):
        # Reuses the parent's exact "is this a common password" check —
        # only the raised message differs.
        if password.lower().strip() in self.passwords:
            raise ValidationError(
                "این رمز عبور بسیار رایج و قابل حدس است",
                code="password_too_common",
            )

    def get_help_text(self):
        return "رمز عبور نباید بسیار رایج و قابل حدس باشد"


class FarsiNumericPasswordValidator(NumericPasswordValidator):
    def validate(self, password, user=None):
        if password.isdigit():
            raise ValidationError(
                "رمز عبور نباید فقط شامل عدد باشد",
                code="password_entirely_numeric",
            )

    def get_help_text(self):
        return "رمز عبور نباید فقط شامل عدد باشد"


class FarsiUserAttributeSimilarityValidator(UserAttributeSimilarityValidator):
    """The trickiest one to translate cleanly — the parent class builds
    its message dynamically per-field (e.g. "too similar to the
    email"), so the field name itself needs a Persian label, not just
    the surrounding sentence."""

    def validate(self, password, user=None):
        if not user:
            return

        for attribute_name in self.user_attributes:
            value = getattr(user, attribute_name, None)
            if not value or not isinstance(value, str):
                continue

            value_parts = value.strip().lower().split()
            password_lower = password.lower()

            for value_part in value_parts:
                if len(value_part) < self.max_similarity * len(password):
                    continue
                if value_part in password_lower or password_lower in value_part:
                    label = FIELD_LABELS_FA.get(attribute_name, attribute_name)
                    raise ValidationError(
                        f"رمز عبور نباید شبیه به {label} باشد",
                        code="password_too_similar",
                    )

    def get_help_text(self):
        return "رمز عبور نباید شبیه به اطلاعات شخصی شما باشد"