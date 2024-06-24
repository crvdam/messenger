import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from .models import User, Message
from datetime import datetime

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        # Connect to room with name of current user
        self.room_group_name = self.scope["url_route"]["kwargs"]["username"]
        async_to_sync(self.channel_layer.group_add)(
        self.room_group_name, self.channel_name
        )
        
        self.accept()
        print(f"user connected to group: {self.room_group_name}")

    def disconnect(self, close_code):
        # Disconnect from room     
        async_to_sync(self.channel_layer.group_discard)(
        self.room_group_name, self.channel_name
        )
        print(f"user disconnected from group {self.room_group_name}")

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        body = text_data_json["body"]
        sender = text_data_json["sender"]
        receiver = text_data_json["receiver"]

        # Attach timestamp to message
        local_timezone = datetime.now().astimezone().tzinfo
        timestamp = datetime.now().astimezone(tz=local_timezone).strftime('%H:%M')

        # Send message to current user group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name, {"type": "chat.message", "body": body, "sender": sender, "receiver": receiver, "timestamp": timestamp}
        )    
        # Send message to friend group
        async_to_sync(self.channel_layer.group_send)(
            receiver, {"type": "chat.message", "body": body, "sender": sender, "receiver": receiver, "timestamp": timestamp}
        )    

        sender_object = User.objects.get(username=sender)
        receiver_object = User.objects.get(username=receiver)

        # If receiver is not already friends with sender, add friend
        if not sender_object in receiver_object.friends.all():
            receiver_object.friends.add(sender_object)

        # Create message history
        message = Message.objects.create(body=body, sender=sender_object, receiver=receiver_object)
        message.save()

    # Receive message from room group
    def chat_message(self, event):
        body = event["body"]
        sender = event["sender"]
        receiver = event["receiver"]
        timestamp = event["timestamp"]
        
        # Send message to WebSocket
        self.send(text_data=json.dumps({"body": body, "sender": sender, "receiver": receiver, "timestamp": timestamp}))

        