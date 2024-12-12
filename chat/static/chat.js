document.addEventListener("DOMContentLoaded", () => {
  // Hide chat input
  document.querySelector(".footer__input").style.display = "none";
  document.querySelector(".footer__input").disabled = true;

  // Determine current active user and open websocket
  console.log(document.querySelector(".current-user__name").textContent);
  const current_user = document.querySelector(
    ".current-user__name"
  ).textContent;
  const chatSocket = open_websocket(current_user);

  get_friend_list(current_user);
  add_friend(current_user);
  send_message(chatSocket, current_user);
  listen(chatSocket, current_user);
});

function get_friend_list(current_user) {
  // Clear friend list
  const container = document.querySelector(".sidebar__friends");
  container.textContent = "";

  // Fetch friend names
  fetch("/friend_list", {
    method: "GET",
  })
    .then((response) => response.json())
    .then((json) =>
      json.forEach((friend) => {
        create_friend_button(current_user, friend);
      })
    )
    .catch((error) => console.error(error));
}

function create_friend_button(current_user, friend) {
  const container = document.querySelector(".sidebar__friends");
  const chat_window = document.querySelector(".chat__window");

  const friend_button = document.createElement("div");
  friend_button.classList.add("friend");
  if (friend.read === false) {
    friend_button.classList.add("new-message");
  }
  friend_button.dataset.friend = friend.friend;

  const profile_picture = document.createElement("div");
  profile_picture.className = "friend__profile-picture";
  profile_picture.innerHTML = `<img src="${friend.profile_picture}">`;

  const friend_name = document.createElement("h3");
  friend_name.className = "friend__name";
  friend_name.innerHTML = friend.friend;

  const last_message = document.createElement("div");
  last_message.className = "friend__last-message";
  last_message.id = `friend__last-message-${friend.friend}`;
  last_message.innerHTML = friend.body;

  const last_message_timestamp = document.createElement("p");
  last_message_timestamp.className = "friend__timestamp";
  last_message_timestamp.id = `friend__timestamp-${friend.friend}`;
  last_message_timestamp.innerHTML = friend.timestamp;

  friend_button.appendChild(profile_picture);
  friend_button.appendChild(friend_name);

  friend_button.appendChild(last_message);
  friend_button.appendChild(last_message_timestamp);
  container.prepend(friend_button);

  // Add button functionality
  friend_button.onclick = () => {
    // This button
    if (friend.friend != chat_window.dataset.active_friend) {
      // Remove 'new-message' styling
      friend_button.classList.remove("new-message");

      // Clear chat window
      chat_window.textContent = "";

      // Display chat window and message input textarea
      document.querySelector(".footer__input").style.display = "block";
      document.querySelector(".footer__input").disabled = false;

      chat_window.dataset.active_friend = friend.friend;
      document.querySelector(".header__name").innerHTML = friend.friend;

      // Load message history
      load_message_history(current_user, friend.friend);
    }
  };
}

function add_friend(current_user) {
  document.querySelector(".add-friend__input").onkeyup = function (e) {
    const submit = document.querySelector(".add-friend__submit");
    if (e.target.value === "") {
      submit.style.display = "none";
    } else {
      submit.style.display = "block";
    }
    // Add friend when return key is pressed
    if (e.key === "Enter") {
      submit.click();
    }
  };

  document.querySelector(".add-friend__submit").onclick = function (e) {
    const friend_input = document.querySelector(".add-friend__input");
    var friend = friend_input.value;
    friend_input.value = "";
    friend_json = JSON.stringify(friend);

    var friend_button = document.querySelector(`[data-friend="${friend}"]`);
    if (friend_button === null) {
      fetch("/add_friend", {
        method: "POST",
        body: friend_json,
      }).then((response) => {
        if (response.status === 400) {
          response.json().then((json) => alert(json["error"]));
        } else {
          response.json().then((json) => {
            friend = {
              friend: friend,
              body: "",
              read: false,
              profile_picture: json["profile_picture"],
              timestamp: "",
            };
            create_friend_button(current_user, friend);
          });
        }
      });
    }
  };
}

function open_websocket(current_user) {
  const chatSocket = new WebSocket(
    "ws://" + window.location.host + "/ws/chat/" + current_user + "/"
  );
  console.log(`Chat opened: ${current_user}`);
  return chatSocket;
}

function send_message(chatSocket, current_user) {
  document.querySelector(".footer__input").onkeyup = function (e) {
    // Submit message when return key is pressed
    if (e.key === "Enter") {
      submit = document.querySelector(".footer__submit").click();
      e.focus;
    }
  };

  document.querySelector(".footer__submit").onclick = function (e) {
    const messageInputDom = document.querySelector(".footer__input");
    const body = messageInputDom.value;
    const receiver =
      document.querySelector(".chat__window").dataset.active_friend;

    // Send message
    if (body != "") {
      chatSocket.send(
        JSON.stringify({
          body: body,
          sender: current_user,
          receiver: receiver,
        })
      );
      messageInputDom.value = "";
    }
  };
}

function listen(chatSocket, current_user) {
  chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);

    container_friends = document.querySelector(".sidebar__friends");
    console.log(data);
    try {
      if (data.sender === current_user) {
        var friend_button = document.querySelector(
          `[data-friend="${data.receiver}"]`
        );
        var last_message = document.querySelector(
          `#friend__last-message-${data.receiver}`
        );
        var last_message_timestamp = document.querySelector(
          `#friend__timestamp-${data.receiver}`
        );
      } else {
        var friend_button = document.querySelector(
          `[data-friend="${data.sender}"]`
        );
        var last_message = document.querySelector(
          `#friend__last-message-${data.sender}`
        );
        var last_message_timestamp = document.querySelector(
          `#friend__timestamp-${data.sender}`
        );
      }
      // Move friend to top of list, display last message
      container_friends.insertBefore(
        friend_button,
        container_friends.firstChild
      );
      last_message.innerHTML = data.body;
      last_message_timestamp.innerHTML = data.timestamp;
    } catch (error) {
      // Incoming message is by user not in friends list, update list
      console.error(error);
      get_friend_list(current_user);
    }

    // Create a chat bubble if incoming message is by user or currently active friend
    active_friend =
      document.querySelector(".chat__window").dataset.active_friend;
    if (data.sender === current_user || data.sender === active_friend) {
      create_bubble(data, current_user);

      // Change friend button style if incoming message is by inactive friend
    } else {
      try {
        friend_button.classList.add("new-message");
      } catch {
        // pass
      }
    }
  };

  chatSocket.onclose = () => {
    console.log(`Chat closed: ${current_user}`);
  };
}

function create_bubble(message, current_user) {
  if (message.body != null) {
    // Add new div for chat bubble
    const chat_window = document.querySelector(".chat__window");
    const chat_bubble = document.createElement("div");

    chat_bubble.innerHTML = message.body;
    chat_window.appendChild(chat_bubble);

    // Style chat bubble according to who sent it
    if (message.sender == current_user) {
      chat_bubble.className = "bubble-user";
    } else {
      chat_bubble.className = "bubble-friend";
    }

    // Add bubble class for general styling
    chat_bubble.classList.add("bubble");

    // Add timestamp and scroll to bottom
    const timestamp = document.createElement("div");
    timestamp.innerHTML = message.timestamp;
    timestamp.className = "bubble__timestamp";
    chat_bubble.appendChild(timestamp);
    chat_window.scrollTop = chat_window.scrollHeight;
  }
}

function load_message_history(current_user, active_friend) {
  var body = { current_user: current_user, active_friend: active_friend };
  body = JSON.stringify(body);

  fetch("/message_history", {
    method: "POST",
    body: body,
  })
    .then((response) => response.json())
    .then((messages) =>
      messages.forEach((message) => {
        create_bubble(message, current_user);
      })
    );
}
