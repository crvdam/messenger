from django.shortcuts import render
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponseRedirect, HttpResponse
from django.http import JsonResponse
from .models import User, Message
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
import json

def index(request):
    if request.user.is_authenticated:
        return HttpResponseRedirect(reverse("lobby"))
    else:
        return render(request, "chat/login.html")

def login_view(request):
    if request.method == "POST":
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("lobby"))
        else: 
            return render(request, "chat/login.html", {
                "message": "Invalid username and/or password."
            })

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]
        profile_picture = request.POST["profile-picture"]
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "chat/register.html", {
                "message": "Passwords must match."
            })
        
        try:
            user = User.objects.create_user(username, email, password)

            if profile_picture != "":
                user.profile_picture = profile_picture
                user.save()
        except IntegrityError:
            return render(request, "chat/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("lobby"))
    else:
        return render(request, "chat/register.html")
    
@login_required
def lobby(request):
    return render(request, "chat/lobby.html")

@csrf_exempt
def add_friend(request):
    friend = json.loads(request.body)
    user = User.objects.get(username=request.user)

    # Check if valid friend
    try:
        friend = User.objects.get(username=friend)
    except ObjectDoesNotExist:
        return JsonResponse({"error":"There is no user with that name."}, status=400)
    if user == friend:
        return JsonResponse({"error":"You can't befriend yourself."}, status=400)
    else:
        user.friends.add(friend)

        return JsonResponse({"profile_picture": friend.profile_picture}, status=201)

@csrf_exempt
def message_history(request):
    data = json.loads(request.body)
    current_user = data["current_user"]
    active_friend = data["active_friend"]

    # Get message history from user to friend, and from friend to user
    user = User.objects.get(username=current_user)
    friend = User.objects.get(username=active_friend)
    history_user = Message.objects.filter(sender=user, receiver=friend) 
    history_friend = Message.objects.filter(sender=friend, receiver=user)

    # Change all of friend's messages to read
    for message in history_friend:
        message.read = True
        message.save()

    # Combine histories and sort
    message_history = history_user | history_friend
    message_history = message_history.order_by("timestamp")    

    result = []
    for message in message_history:
        message_dict = {
            "body": message.body,
            "sender": message.sender.username,
            "receiver": message.receiver.username,
            "timestamp": message.get_delta_time()
        }
        result.append(message_dict)
    
    result = json.dumps(result)
    return HttpResponse(result)

def friend_list(request):
    result = []
    friends = request.user.friends.all()

    # For each friend, get the last message sent between user and friend
    for friend in friends:
        try:
            last_message = Message.objects.filter(receiver=request.user, sender=friend).latest("timestamp")
            friend_dict = {
                "friend": last_message.sender.username,
                "body": last_message.body,
                "read": last_message.read,
                "profile_picture": friend.profile_picture,
                "timestamp": last_message.get_delta_time(),
                "order": last_message.id
            }
        except ObjectDoesNotExist:    
            try:
                last_message = Message.objects.filter(receiver=friend, sender=request.user).latest("timestamp")
                friend_dict = {
                    "friend": friend.username,
                    "body": last_message.body,
                    "read": True, 
                    "profile_picture": friend.profile_picture,
                    "timestamp": last_message.get_delta_time(),
                    "order": last_message.id
                }
            except ObjectDoesNotExist:
                continue
        result.append(friend_dict)

    # Sort friends according to last message id
    result = sorted(result, key=lambda x: x["order"])

    for dict in result:
        del dict["order"]
    
    result = json.dumps(result)
    return HttpResponse(result)
