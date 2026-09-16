"""
Seeds official Iranian holidays into the Holiday table for one Jalali
year, pulled from BaseMax/persian-holidays-api's recurring holiday
list. That source has no year attached — shamsi and gregorian dates
repeat every year, hijri dates are lunar and drift ~11 days earlier
each solar year, so they're computed per-target-year, not copied
as-is. Only is_holiday=true entries are imported.

Usage:
    python manage.py seed_holidays 1405
    python manage.py seed_holidays 1405 --file holidays.json
    python manage.py seed_holidays 1405 --dry-run
"""
import datetime as dt
import json
import unicodedata

import jdatetime
import requests
from django.core.management.base import BaseCommand
from hijri_converter import Gregorian, Hijri

from api.models import Holiday

DEFAULT_URL = "https://raw.githubusercontent.com/BaseMax/persian-holidays-api/main/holidays.json"

SHAMSI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

GREGORIAN_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def normalize(text):
    """Strips diacritics, unifies Arabic/Persian letter variants (ي/ی,
    ك/ک), and removes spaces and zero-width non-joiners — the source
    mixes Arabic and Persian spelling/separator conventions for the
    same month names, so this collapses them to one comparable form."""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    stripped = stripped.replace("ي", "ی").replace("ك", "ک")
    stripped = stripped.replace(" ", "").replace("\u200c", "")
    return stripped.strip()


SHAMSI_INDEX = {normalize(name): i + 1 for i, name in enumerate(SHAMSI_MONTHS)}


def hijri_month_number(name_parts):
    """Matches a Hijri month by keyword rather than exact string —
    the source spells two-part months (Rabi', Jumada) as separate
    words with varying spelling for the second half ('الثاني' /
    'الآخر' both mean the same thing), so substring matching on the
    normalized, joined text is more robust than a lookup table."""
    text = normalize(" ".join(name_parts))

    if "محرم" in text:
        return 1
    if "صفر" in text:
        return 2
    if "ربیع" in text:
        return 3 if "اول" in text else 4
    if "جماد" in text:
        return 5 if "اول" in text else 6
    if "رجب" in text:
        return 7
    if "شعبان" in text:
        return 8
    if "رمضان" in text:
        return 9
    if "شوال" in text:
        return 10
    if "قعده" in text:
        return 11
    if "حجه" in text or "حجة" in text:
        return 12
    return None


class Command(BaseCommand):
    help = "Seed official Iranian holidays for one Jalali year from a persian-holidays-api-format JSON source."

    def add_arguments(self, parser):
        parser.add_argument("jalali_year", type=int, help="e.g. 1405")
        parser.add_argument("--file", type=str, help="Local JSON file instead of fetching --url")
        parser.add_argument("--url", type=str, default=DEFAULT_URL)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        jalali_year = options["jalali_year"]

        if options["file"]:
            with open(options["file"], encoding="utf-8") as f:
                entries = json.load(f)
        else:
            resp = requests.get(options["url"], timeout=15)
            resp.raise_for_status()
            entries = resp.json()

        range_start = jdatetime.date(jalali_year, 1, 1).togregorian()
        next_year_start = jdatetime.date(jalali_year + 1, 1, 1).togregorian()
        range_end = next_year_start - dt.timedelta(days=1)

        resolved = []
        skipped = []

        for entry in entries:
            if not entry.get("is_holiday"):
                continue

            name = entry["event_name"]
            date_info = entry["date"]
            date_type = date_info["type"]
            parts = date_info["date"]
            day = int(parts[0])
            unit_parts = parts[1:]  # everything after the day — may be 1 or 2 words

            if date_type == "shamsi":
                month = SHAMSI_INDEX.get(normalize(unit_parts[0]))
                if not month:
                    skipped.append((name, f"unrecognized shamsi month '{unit_parts[0]}'"))
                    continue
                try:
                    g = jdatetime.date(jalali_year, month, day).togregorian()
                except ValueError:
                    # Esfand's last day is 29 or 30 depending on
                    # leap year — a source encoding "last day" as a
                    # fixed 30 will fail in a non-leap year, so fall
                    # back to 29 rather than dropping the entry.
                    if month == 12 and day == 30:
                        try:
                            g = jdatetime.date(jalali_year, 12, 29).togregorian()
                        except ValueError as e:
                            skipped.append((name, str(e)))
                            continue
                    else:
                        skipped.append((name, "invalid shamsi date"))
                        continue
                resolved.append((g, name))

            elif date_type == "gregorian":
                try:
                    month = GREGORIAN_MONTHS.index(unit_parts[0]) + 1
                except ValueError:
                    skipped.append((name, f"unrecognized gregorian month '{unit_parts[0]}'"))
                    continue
                for candidate_year in {range_start.year, range_end.year}:
                    try:
                        g = dt.date(candidate_year, month, day)
                    except ValueError:
                        continue
                    if range_start <= g <= range_end:
                        resolved.append((g, name))

            elif date_type == "hijri":
                month = hijri_month_number(unit_parts)
                if not month:
                    skipped.append((name, f"unrecognized hijri month '{' '.join(unit_parts)}'"))
                    continue

                approx_hijri_year = Gregorian(range_start.year, range_start.month, range_start.day).to_hijri().year
                found = False
                for hy in range(approx_hijri_year - 1, approx_hijri_year + 2):
                    try:
                        g_hijri = Hijri(hy, month, day).to_gregorian()
                        g = dt.date(g_hijri.year, g_hijri.month, g_hijri.day)
                    except ValueError:
                        continue
                    if range_start <= g <= range_end:
                        resolved.append((g, name))
                        found = True
                if not found:
                    skipped.append((name, "no matching hijri year in range"))

        merged = {}
        for g, name in resolved:
            if g in merged:
                if name not in merged[g]:
                    merged[g] += f" / {name}"
            else:
                merged[g] = name

        self.stdout.write(f"Resolved {len(merged)} holiday dates for {jalali_year}.")
        if skipped:
            self.stdout.write(self.style.WARNING(f"{len(skipped)} entries skipped:"))
            for name, reason in skipped:
                self.stdout.write(f"  - {name}: {reason}")

        if options["dry_run"]:
            for g, name in sorted(merged.items()):
                self.stdout.write(f"  {g}  {name}")
            self.stdout.write(self.style.WARNING("Dry run — nothing saved."))
            return

        created, updated = 0, 0
        for g, name in merged.items():
            obj, was_created = Holiday.objects.update_or_create(date=g, defaults={"name": name})
            created += was_created
            updated += not was_created

        self.stdout.write(self.style.SUCCESS(f"Done — {created} created, {updated} updated."))