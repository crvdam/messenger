from django.contrib.auth.models import AbstractUser
from django.db import models
from datetime import datetime


class User(AbstractUser):
    profile_picture = models.TextField(default="https://cdn.iconscout.com/icon/premium/png-512-thumb/profile-1965627-1657225.png?f=webp&w=512")
    friends = models.ManyToManyField("self", blank=True)

class Message(models.Model):
    body = models.TextField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sender')
    receiver = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name='receiver')
    read = models.BooleanField(default=False)

    def get_delta_time(self):
        local_timezone = datetime.now().astimezone().tzinfo
        time_message = self.timestamp.astimezone(tz=local_timezone)
        time_now = datetime.now().astimezone(tz=local_timezone)
        delta = time_message - time_now
        date_now = time_now.date()
        date_message = time_message.date()
        
        # Message is older than one year so return year month and day
        if delta.days > 364:
            return self.timestamp.astimezone(tz=local_timezone).strftime('%d %b %Y')
        # Message is older than today so return month and day
        elif date_now != date_message:
            return self.timestamp.astimezone(tz=local_timezone).strftime('%d %b')        
        # Message is from today so return hours and minutes
        else:
            return self.timestamp.astimezone(tz=local_timezone).strftime('%H:%M')

    def __str__ (self):
        return f"{self.sender}: {self.body} ({self.timestamp.strftime('%H:%M on %d %b %Y')})"
    
