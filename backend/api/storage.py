from urllib.parse import quote

from django.conf import settings
from storages.backends.s3 import S3Storage


class SupabasePublicStorage(S3Storage):
    def url(self, name, parameters=None, expire=None, http_method=None):
        name = name.lstrip("/")

        return (
            f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co"
            f"/storage/v1/object/public/"
            f"{settings.AWS_STORAGE_BUCKET_NAME}/"
            f"{quote(name, safe='/')}"
        )