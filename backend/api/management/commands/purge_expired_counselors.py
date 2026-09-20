from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Counselor  # match your actual app name

class Command(BaseCommand):
    help = 'Soft-purge counselor profiles whose subscription has been expired 90+ days'

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(days=90)
        n = 0
        for c in Counselor.objects.filter(is_purged=False):
            end = c.get_last_subscription_end()
            if not end or end < cutoff:
                c.purge()
                n += 1
        self.stdout.write(f'Purged {n} expired counselor profiles')