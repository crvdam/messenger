from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("lobby", views.lobby, name="lobby"),
    path("add_friend", views.add_friend, name="add_friend"),
    path("message_history", views.message_history, name="message_history"),
    path("friend_list", views.friend_list, name="friend_list"),
]
