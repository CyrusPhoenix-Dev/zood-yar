"""
Data migration seeding the same 8 categories used on ServicesPage, so
they exist as real, filterable Specialty rows from day one instead of
an empty table. Run: python manage.py makemigrations && migrate
(this file's migration number/dependency will need adjusting to match
whatever your actual latest migration is — this is a template).
"""
from django.db import migrations

SPECIALTIES = [
    ("family", "مشاوره خانواده"),
    ("marriage", "مشاوره ازدواج و زوجین"),
    ("individual", "مشاوره فردی و روان‌شناسی"),
    ("child", "مشاوره کودک و نوجوان"),
    ("educational", "مشاوره تحصیلی"),
    ("addiction", "مشاوره ترک اعتیاد"),
    ("grief", "مشاوره سوگ"),
    ("career", "مشاوره شغلی"),
]


def seed_specialties(apps, schema_editor):
    Specialty = apps.get_model("api", "Specialty")
    for slug, label in SPECIALTIES:
        Specialty.objects.get_or_create(slug=slug, defaults={"label": label})


def remove_specialties(apps, schema_editor):
    Specialty = apps.get_model("api", "Specialty")
    Specialty.objects.filter(slug__in=[s[0] for s in SPECIALTIES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_specialty_counselor_specialties"),  # adjust to your actual latest migration
    ]
    operations = [
        migrations.RunPython(seed_specialties, remove_specialties),
    ]
