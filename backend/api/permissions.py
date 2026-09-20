from rest_framework import permissions
from .models import Plan

AUTO_GENERATOR_TIERS = {Plan.Tier.SILVER, Plan.Tier.GOLD, Plan.Tier.COMPANY}

class HasAutoGeneratorAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        c = getattr(request.user, 'counselor_profile', None)
        if not c:
            return False
        sub = c.get_active_subscription()
        return bool(sub and sub.plan.tier in AUTO_GENERATOR_TIERS)
    
