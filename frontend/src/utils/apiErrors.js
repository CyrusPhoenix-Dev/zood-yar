// Central error translator for the whole app. Pass the full Axios
// error object (not just err.response.data) — this handles cases
// beyond field validation: no response at all (network/CORS issues),
// server errors, auth failures, and DRF's several different error
// response shapes.

const MESSAGE_MAP = {
  // ===== django.contrib.auth.password_validation =====
  "This password is too short. It must contain at least 8 characters.":
    "رمز عبور باید حداقل ۸ کاراکتر باشد",
  "This password is too common.":
    "این رمز عبور بسیار رایج و قابل حدس است",
  "This password is entirely numeric.":
    "رمز عبور نباید فقط شامل عدد باشد",
  "The password is too similar to the username.":
    "رمز عبور نباید شبیه به نام کاربری باشد",
  "The password is too similar to the email address.":
    "رمز عبور نباید شبیه به ایمیل باشد",
  "The password is too similar to the first name.":
    "رمز عبور نباید شبیه به نام باشد",
  "The password is too similar to the last name.":
    "رمز عبور نباید شبیه به نام خانوادگی باشد",

  // ===== Field-level validation (uniqueness, required, format) =====
  "A user with that username already exists.":
    "این نام کاربری قبلا ثبت شده است",
  "user with this email already exists.":
    "این ایمیل قبلا ثبت شده است",
  "user with this phone already exists.":
    "این شماره تلفن قبلا ثبت شده است",
  "This field is required.":
    "این فیلد الزامی است",
  "This field may not be blank.":
    "این فیلد نمی‌تواند خالی باشد",
  "Enter a valid email address.":
    "ایمیل وارد شده معتبر نیست",
  "Ensure this field has no more than 20 characters.":
    "این مقدار خیلی طولانی است",

  // ===== simplejwt auth errors =====
  "No active account found with the given credentials":
    "نام کاربری یا رمز عبور اشتباه است",
  "Token is invalid or expired":
    "نشست شما منقضی شده است. دوباره وارد شوید",
  "Token is blacklisted":
    "این نشست دیگر معتبر نیست. دوباره وارد شوید",

  // ===== Your own OTP views' `detail` messages =====
  "کد نامعتبر یا منقضی شده است": "کد نامعتبر یا منقضی شده است",
  "حسابی با این شماره یافت نشد": "حسابی با این شماره یافت نشد",
  "حسابی با این ایمیل یافت نشد": "حسابی با این ایمیل یافت نشد",
};

const STATUS_MESSAGES = {
  400: "اطلاعات ارسال‌شده نامعتبر است",
  401: "برای انجام این کار باید وارد حساب کاربری خود شوید",
  403: "شما اجازه دسترسی به این بخش را ندارید",
  404: "موردی که به دنبال آن بودید پیدا نشد",
  409: "این عملیات با اطلاعات فعلی سیستم تداخل دارد",
  429: "تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید",
  500: "خطایی در سرور رخ داد. لطفا بعدا دوباره تلاش کنید",
  502: "سرور در دسترس نیست. لطفا بعدا دوباره تلاش کنید",
  503: "سرویس موقتا در دسترس نیست",
};

function translateOne(msg) {
  return MESSAGE_MAP[msg] || msg;
}

/**
 * Flattens DRF's several possible error shapes into a list of strings:
 *  - { field: ["msg", "msg"] }        — serializer field errors
 *  - { non_field_errors: ["msg"] }    — serializer-level errors
 *  - { detail: "msg" }                — APIView / permission errors
 *  - "plain string"                   — rare, but happens
 *  - nested objects (one level)       — e.g. nested serializers
 */
function flattenErrorData(data, depth = 0) {
  if (data == null) return [];
  if (typeof data === "string") return [data];
  if (Array.isArray(data)) return data.flatMap((item) => flattenErrorData(item, depth));

  if (typeof data === "object") {
    if (depth > 1) return []; // avoid runaway recursion on unexpected shapes
    return Object.values(data).flatMap((value) => flattenErrorData(value, depth + 1));
  }

  return [String(data)];
}

/**
 * Main entry point. Pass the full caught error from an Axios call:
 *
 *   try {
 *     await api.post(...);
 *   } catch (err) {
 *     setError(translateApiError(err));
 *     console.error(err);
 *   }
 */
export function translateApiError(err) {
  // No response at all — network failure, CORS misconfig, backend down,
  // or the request timed out before reaching the server.
  if (!err?.response) {
    if (err?.code === "ECONNABORTED") {
      return "ارتباط با سرور طولانی شد. دوباره تلاش کنید";
    }
    return "اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید";
  }

  const { status, data } = err.response;
  const messages = flattenErrorData(data).map(translateOne);

  if (messages.length > 0) {
    return messages.join(" \n ");
  }

  // Response came back but had no usable body (rare) — fall back to a
  // generic message keyed off the HTTP status code.
  return STATUS_MESSAGES[status] || "خطایی رخ داد. دوباره تلاش کنید";
}

// Backward-compatible alias for existing call sites using the old name.
export function translateApiErrors(data) {
  const messages = flattenErrorData(data).map(translateOne);
  return messages.length > 0 ? messages.join(" \n ") : "خطایی رخ داد. دوباره تلاش کنید";
}