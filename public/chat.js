let socket = io(); //  io.connect("http://localhost:4000");
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let hideCameraButton = document.getElementById("hideCameraButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");

let muteFlag = false;
let hideCameraFlag = false;

let creator = false;
let rtcPeerConnection;
let userStream;

let iceServers = { 
    iceServers: [
        {urls: "stun:stun.services.mozilla.com"},
        {urls: "stun:stun1.l.google.com:19302"}
    ]
}

joinButton.addEventListener("click", function() {
    if(roomInput.value === "") {
        alert("please enter a room name");
    } else {
        socket.emit("join", roomInput.value);
    }
})

leaveRoomButton.addEventListener("click", function() {
    socket.emit("leave", roomInput.value);

    divVideoChatLobby.style = "display:block";
    divButtonGroup.style = "display:none";

    if (userVideo.srcObject) {
        userVideo.srcObject.getTracks()[0].stop();
        userVideo.srcObject.getTracks()[1].stop();
        userVideo.srcObject = null;
    }

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
        peerVideo.srcObject = null;
    }
    
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
})

muteButton.addEventListener("click", function() {
    muteFlag = !muteFlag;
    if(muteFlag) {
        userStream.getTracks()[0].enabled = false;
        muteButton.textContent="Unmute";
    } else {
        userStream.getTracks()[0].enabled = true;
        muteButton.textContent="Mute";
    }
})

hideCameraButton.addEventListener("click", function() {
    hideCameraFlag = !hideCameraFlag;
    if(hideCameraFlag) {
        userStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent="Show Camera";
    } else {
        userStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent="Hide Camera";
    }
})

socket.on("created", function() {
    creator = true;
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {width: 500, height: 500}
    })
    .then((mediaStream) => {
        userStream = mediaStream;
        divVideoChatLobby.style="display:none";
        divButtonGroup.style="display:flex";
        userVideo.srcObject = mediaStream;
        userVideo.onloadedmetadata = () => {
            userVideo.play();
        }
    })
    .catch((err) => {
        alert("Couldn't Access User Media");
    })
});

socket.on("joined", function() {
    creator = false;
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {width: 500, height: 500}
    })
    .then((mediaStream) => {
        userStream = mediaStream;
        divVideoChatLobby.style="display:none";
        divButtonGroup.style="display:flex";
        userVideo.srcObject = mediaStream;
        userVideo.onloadedmetadata = () => {
            userVideo.play();
        };
        socket.emit("ready", roomInput.value);
    })
    .catch((err) => {
        alert("Couldn't Access User Media");
    })
});

socket.on("full", function() {
    alert("Room is Full, Can't Join");
});

socket.on("ready", function() {
    if(creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.createOffer().then((offer) => {
            rtcPeerConnection.setLocalDescription(offer);
            socket.emit("offer", offer, roomInput.value);
        })
        .catch((error) => {
            alert("Here! " + error);
            console.log(error);
        })
    }
});

socket.on("candidate", function(candidate) {
    let iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
});

socket.on("offer", function(offer) {
    if(!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer().then((answer) => {
            rtcPeerConnection.setLocalDescription(answer);
            socket.emit("answer", answer, roomInput.value);
        })
        .catch((error) => {
            alert("Here! " + error);
            console.log(error);
        })
    }
});

socket.on("answer", function(answer) {
    rtcPeerConnection.setRemoteDescription(answer);
});

socket.on("leave", function() {
    creator = true;

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
        peerVideo.srcObject = null;
    }

    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
});

function OnIceCandidateFunction (event) {
    if(event.candidate) {
        socket.emit("candidate", event.candidate, roomInput.value);
    }
}

function OnTrackFunction (event) {
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function (e) {
        peerVideo.play();
    }
}