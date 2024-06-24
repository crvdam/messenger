document.addEventListener("DOMContentLoaded", () => {
    // Hide chat window and chat input
    document.querySelector("#chat-window").style.background = "#222e35";
    document.querySelector("#chat-footer").style.display = "none";
    document.querySelector("#chat-form-text").disabled = true;

    // Determine current active user and open websocket
    const current_user = JSON.parse(document.getElementById('current_user').textContent);
    const chatSocket = open_websocket(current_user);
    
    get_friend_list(current_user);
    add_friend(current_user);
    send_message(chatSocket, current_user);
    listen(chatSocket, current_user);
})

function get_friend_list(current_user) {
    // Clear friend list
    const container = document.querySelector("#container-friends-buttons");
    container.textContent = "";

    // Fetch friend names
    fetch("/friend_list", {
        method: "GET",
    })
    .then(response => response.json())
    .then(json => json.forEach(friend => {
        create_friend_button(current_user, friend);
    }))
}

function create_friend_button(current_user, friend) {
    const container = document.querySelector("#container-friends-buttons");
    const chat_window = document.querySelector("#chat-window");

    const friend_button = document.createElement("div");
    if (friend.read === true) {
        friend_button.className = "friend-button";
    } else {
        friend_button.className = "friend-button-new-message";
    }
    friend_button.dataset.friend = friend.friend;

    const profile_picture = document.createElement("div");
    profile_picture.className = "friend-profile-picture";
    profile_picture.innerHTML = `<img src="${friend.profile_picture}">`;

    const friend_name = document.createElement("div");
    friend_name.className = "friend-name";
    friend_name.innerHTML = friend.friend;

    const last_message = document.createElement("div");
    last_message.className = "last-message";
    last_message.id = `last-message-${friend.friend}`;
    last_message.innerHTML = friend.body;

    const last_message_timestamp = document.createElement("div");
    last_message_timestamp.className = "last-message-timestamp";
    last_message_timestamp.id = `last-message-timestamp-${friend.friend}`;
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
            friend_button.className = "friend-button"

            // Clear chat window
            chat_window.textContent = "";      

            // Display chat window and message input textarea
            chat_window.style.background = "#10191f";
            document.querySelector("#chat-footer").style.display = "block";
            document.querySelector("#chat-form-text").disabled = false;

            chat_window.dataset.active_friend = friend.friend; 
            document.querySelector("#active-friend").innerHTML = friend.friend;

            // Load message history
            load_message_history(current_user, friend.friend)
        }
    }
}
    
function add_friend(current_user) {
    document.querySelector("#add-friend-input").onkeyup = function(e) {
        // Add friend when return key is pressed
        if (e.key === "Enter") {
            submit = document.querySelector("#add-friend-submit").click();
        }
    }

    document.querySelector("#add-friend-submit").onclick = function(e) {
        const friend_input = document.querySelector("#add-friend-input");
        var friend = friend_input.value
        friend_input.value = "";
        friend_json = JSON.stringify(friend)

        var friend_button = document.querySelector(`[data-friend="${friend}"]`);
        if (friend_button === null) {
            fetch("/add_friend", {
                method: "POST",
                body: friend_json
            })
            .then(response => {
                if (response.status === 400) {
                    response.json()
                    .then(json => alert(json["error"]))
    
                } else {
                    response.json()
                    .then(json => {
                        friend = {
                            "friend": friend,
                            "body": "",
                            "read": false,
                            "profile_picture": json["profile_picture"],
                            "timestamp": ""
                        }
                        create_friend_button(current_user, friend)
                    })
                    
                }
            })
        }
    }
}

function open_websocket(current_user){
    const chatSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/chat/'
        + current_user
        + '/'
    )
    console.log(`Chat socket opened: ${current_user}`)
    return chatSocket;
}

function send_message(chatSocket, current_user){
    document.querySelector("#chat-form-text").onkeyup = function(e) {
        // Submit message when return key is pressed
        if (e.key === 'Enter') {
            submit = document.querySelector('#chat-form-submit').click();
            e.focus;
        }
    }
    
    document.querySelector("#chat-form-submit").onclick = function(e) {
        const messageInputDom = document.querySelector("#chat-form-text");
        const body = messageInputDom.value;
        const receiver = document.querySelector("#chat-window").dataset.active_friend

        // Send message
        if (body != '') {
            chatSocket.send(JSON.stringify({
                'body': body,
                'sender': current_user,
                'receiver': receiver
            }));
            messageInputDom.value = '';
        }
    }
}

function listen(chatSocket, current_user) {
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);

        container_friends = document.querySelector("#container-friends-buttons");
        console.log(data)
        try {
            if (data.sender === current_user){
                var friend_button = document.querySelector(`[data-friend="${data.receiver}"]`);
                var last_message = document.querySelector(`#last-message-${data.receiver}`);
                var last_message_timestamp = document.querySelector(`#last-message-timestamp-${data.receiver}`);
            } else {
                var friend_button = document.querySelector(`[data-friend="${data.sender}"]`);
                var last_message = document.querySelector(`#last-message-${data.sender}`);
                var last_message_timestamp = document.querySelector(`#last-message-timestamp-${data.sender}`);
            }
                // Move friend to top of list, display last message
                container_friends.insertBefore(friend_button, container_friends.firstChild);
                last_message.innerHTML = data.body;
                last_message_timestamp.innerHTML = data.timestamp;
        } catch(error) {
            // Incoming message is by user not in friends list, update list
            console.log(error);
            get_friend_list(current_user);

        }
            
        // Create a chat bubble if incoming message is by user or currently active friend
        active_friend = document.querySelector("#chat-window").dataset.active_friend;
        if (data.sender === current_user || data.sender === active_friend) {
            create_bubble(data, current_user);

        // Change friend button style if incoming message is by inactive friend
        } else {
            try {
                friend_button.className = "friend-button-new-message";
            }
            catch {
                // pass
            }
        }
    }

    chatSocket.onclose = () => {
        console.log(`Chat socket closed: ${current_user}`)
    }
}

function create_bubble(message, current_user) {
    if (message.body != null) {
        // Add new div for chat bubble
        const chat_window = document.querySelector("#chat-window");
        const chat_bubble = document.createElement("div");

        chat_bubble.innerHTML = message.body;
        chat_window.appendChild(chat_bubble);

        // Style chat bubble according to who sent it
        if (message.sender == current_user) {
            chat_bubble.className = "chat-bubble-user";
        } else {
            chat_bubble.className = "chat-bubble-friend";
        }

        // Add timestamp and scroll to bottom
        const timestamp = document.createElement('div');
        timestamp.innerHTML = message.timestamp;
        timestamp.className = "chat-bubble-timestamp"
        chat_bubble.appendChild(timestamp)
        chat_window.scrollTop = chat_window.scrollHeight;
    }
}

function load_message_history(current_user, active_friend) {
    var body = {current_user: current_user, active_friend: active_friend}
    body = JSON.stringify(body)

    fetch("/message_history", {
        method: "POST",
        body: body
    })
    .then(response => response.json())
    .then(messages => messages.forEach((message) => {
        create_bubble(message, current_user)
    }))
        
}


