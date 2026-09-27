from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views import SitemapView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),  # everything else lives in the app
    path("sitemap.xml", SitemapView.as_view(), name="sitemap"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
