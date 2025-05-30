import express from 'express';
const app = express();

import http from "http";
const server = http.createServer(app);

import cors from "cors";

import { Server as ioServer } from "socket.io";

const liveURL = 'https://callsigns-oulv.vercel.app';
// const liveURL = 'http://localhost:3000';

const io = new ioServer(server, {
	cors: {
		origin: "https://callsigns-oulv.vercel.app",
		// origin: "*",
		methods: ["GET", "POST"],
	}
});

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const wordFile = require("./words/words.json");

import csvJSON from "./words/convertCsv.js";

app.use(cors());

app.use(express.json());

server.listen(3001, () => {
	console.log("SERVER RUNNING");
});

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send("Something broke!");
});

app.get("/getMysteryWord", (req, res) => {
	const mysteryWord = getMysteryWord();
	res.status(200).send(mysteryWord);
});

app.post("/newJsonFile", (req, res) => {
	const newList = JSON.parse(csvJSON());
	const newListWord = newList[Math.floor(Math.random() * newList.length)].word;
	console.log(newListWord);
	res.status(200);
});

// "Board" --remove this line later
// let count = 72;

const getMysteryWord = () => {

	// --remove these lines later
	// const randomWord = wordFile[count].Word;
	// count++;

	// reactivate this line
	const randomWord = wordFile[Math.floor(Math.random() * wordFile.length)].Word;
	return randomWord;
};

let roomLookup = [];

io.on("connection", (socket) => {
	// every connection has a unique socket id

	console.log(`User Connected: ${socket.id}`); // prints socket id of connection

	const getSocketInfo = () => {

		const activeUsers = [...io.sockets.sockets.values()].map((socketObj) => {

			return {

				username: socketObj.username,
				socketID: socketObj.id,
				rooms: socketObj.rooms

			};

		});

		// console.log(activeUsers);

	};

	const getPlayersInLobby = (roomName) => {

		const lobby = io.sockets.adapter.rooms.get(roomName);

		return usernameLookup([...lobby]);

	};

	const usernameLookup = (lobbyArray) => {

		return lobbyArray.map((socketID) => {

			const foundSocket = io.sockets.sockets.get(socketID);

			return {

				playerName: foundSocket.username,
				isReady: foundSocket.isReady,
				socketID: socketID

			};

		});

	};

	getSocketInfo();

	socket.on("gameInfo", ({ username, roomName, numPlayers, aiPlayers, numGuesses, numRounds, timeLimit, keepScore }, isRoomCreated, isReturnedToLobby) => {

		socket.username = username;

		socket.isReady = true;

		if (!isRoomCreated) {

			const roomID = socket.id + Math.floor(Math.random() * 10);

			socket.join(roomID);

			socket.roomID = roomID;

			roomLookup.push({
				roomID: roomID,
				roomName: roomName,
				host: username,
				hostID: socket.id,
				numPlayers: numPlayers,
				aiPlayers: aiPlayers,
				prevAiPlayers: aiPlayers,
				numGuesses: numGuesses,
				numRounds: numRounds,
				timeLimit: timeLimit,
				keepScore: keepScore,
				isClosedRoom: false,
				isGameStarted: false,
				guesser: "",
				guesserID: "",
				setGuesser: false,
				newHostAssigned: false
			});

			socket.emit("getRoomInfo", `${liveURL}/lobby/${socket.roomID}`, [{ playerName: socket.username, isReady: socket.isReady }], socket.roomID);

		} else {

			const findRoom = roomLookup.find(({ roomID }) => { return roomID === socket.roomID });

			if (findRoom) {

				findRoom.host = username;
				findRoom.roomName = roomName;
				findRoom.numPlayers = numPlayers;
				findRoom.aiPlayers = aiPlayers;
				findRoom.numGuesses = numGuesses;
				findRoom.numRounds = numRounds;
				findRoom.timeLimit = timeLimit;
				findRoom.keepScore = keepScore;

				const roomList = getPlayersInLobby(socket.roomID);

				if (isReturnedToLobby) {

					socket.to(socket.roomID).emit("getRoomList", roomList, findRoom.isGameStarted);

				}

				io.to(socket.roomID).emit("updateRoomInfo", `${liveURL}/lobby/${socket.roomID}`, roomList, socket.roomID, findRoom);

			}

		}

		getSocketInfo();

		// console.log(roomLookup);

	});

	socket.on("closeRoom", (isClosedRoom) => {

		const findRoom = roomLookup.find(({ roomID }) => { return roomID === socket.roomID });

		if (findRoom) {

			findRoom.isClosedRoom = isClosedRoom;

			socket.to(socket.roomID).emit("isRoomClosed", isClosedRoom);

		} else {

			console.log("unable to find room");
			
		}

		// console.log(findRoom);

	});

	socket.on("selectGuesser", (guesser) => {

		const findRoom = roomLookup.find(({ roomID }) => { return roomID === socket.roomID });

		if (findRoom) {

			findRoom.guesser = guesser;

			// get all socketIDs in lobby as strings
			const socketsInLobby = [...io.sockets.adapter.rooms.get(socket.roomID)];

			const guesserSocketID = socketsInLobby.find((socketID) => {

				// use those strings to get the actual socket objects
				const foundSocket = io.sockets.sockets.get(socketID);

				return foundSocket.username === guesser;

			});

			// console.log(guesserSocketID);

			if (guesserSocketID !== undefined) {

				findRoom.guesserID = guesserSocketID;

				findRoom.setGuesser = true;

			} else {

				findRoom.guesserID = "";

				findRoom.setGuesser = false;

			}

			console.log(findRoom);

			io.to(socket.roomID).emit("guesserSelected", guesser);

		} else {

			console.log("unable to find room");
			
		}

	});

	socket.on("roomCheck", (roomID, isHostExcluded) => {

		const findRoom = roomLookup.find((room) => { return room.roomID === roomID });

		const lobby = io.sockets.adapter.rooms.get(roomID);

		if (lobby) {

			const socketsInLobby = [...lobby];

			const inRoom = socketsInLobby.includes(socket.id);

			if (findRoom && (!findRoom.isClosedRoom || inRoom)) {

				const roomList = getPlayersInLobby(roomID);

				// console.log("players in " + findRoom.roomName + ": ");

				// console.log(roomList);

				if (!isHostExcluded) {

					socket.emit("roomExists", roomList, `${liveURL}/lobby/${roomID}`, findRoom, inRoom);

				} else {

					socket.emit("sendGameStart", roomList, findRoom);

				}

			} else {

				socket.emit("roomExists", ...[,,,,], findRoom?.isClosedRoom);

			}

		} else {

			socket.emit("roomExists", ...[,,,,], findRoom?.isClosedRoom);

		}

	});

	socket.on("joinRoom", (roomName, username, isReturning) => {

		const findRoom = roomLookup.find(({ roomID }) => { return roomID === roomName });

		const lobby = [...io.sockets.adapter.rooms.get(roomName)];

		if (isReturning === true) {

			socket.isReady = false;

			const roomList = getPlayersInLobby(roomName);

			socket.emit("getLobby", roomList, findRoom);

			socket.to(roomName).emit("getRoomList", roomList, findRoom.isGameStarted);

			socket.to(findRoom.hostID).emit("sendSelectedPlayers");

		} else if (lobby.includes(socket.id)) {

			console.log(socket.username + " is changing their username to " + username);

			const isNull = socket.username === null;

			socket.username = username;

			getSocketInfo();

			const roomList = getPlayersInLobby(roomName);

			if (isNull) {

				io.to(roomName).emit("getRoomList", roomList, findRoom.isGameStarted);

			} else {

				io.to(roomName).emit("getRoomList", roomList);

			}

		} else if (findRoom && !findRoom.isClosedRoom) {

			socket.username = username;

			console.log(username + " is joining " + roomName);

			socket.join(roomName);

			socket.roomID = roomName;

			getSocketInfo();

			const roomList = getPlayersInLobby(roomName);

			// if successful
			if (roomList.some(({ playerName }) => { return playerName === username })) {

				socket.emit("getLobby", roomList, findRoom);

				socket.to(findRoom.hostID).emit("sendSelectedPlayers");

			} else {

				socket.emit("getLobby");

			}

		} else {

			socket.emit("getLobby", ...[,,], findRoom?.isClosedRoom);

		}

	});

	socket.on("setNewHost", (roomName, username) => {

		const findRoom = roomLookup.find(({ roomID }) => { return roomID === roomName });

		findRoom.host = username;

	});

	socket.on("sendIsReady", (roomID) => {

		socket.isReady = !socket.isReady;

		const roomList = getPlayersInLobby(roomID);

		io.to(roomID).emit("getRoomList", roomList);

	});

	socket.on("setSelectedPlayers", (selectedPlayers) => {

		socket.to(socket.roomID).emit("getSelectedPlayers", selectedPlayers);

	});

	socket.on("getPlayersInGame", (hostID) => {

		socket.to(hostID).emit("sendInGame", socket.id);

	});

	socket.on("transmitInGame", (inGame, socketID) => {

		socket.to(socketID).emit("receiveInGame", inGame);

	});

	socket.on("announceGameStart", (inGame, roomDetails) => {

		socket.to(socket.roomID).emit("receiveInGame", inGame, roomDetails);

	});

	socket.on("removePlayer", (player) => {

		[...io.sockets.adapter.rooms.get(socket.roomID)].some((socketID) => {

			const foundSocket = io.sockets.sockets.get(socketID);

			if (player === foundSocket.username) {

				console.log(`${player} has been removed from ${socket.roomID}`);

				socket.to(foundSocket.id).emit("exitLobby");

				foundSocket.leave(socket.roomID);

				// console.log(getPlayersInLobby(socket.roomID));

				const findRoom = roomLookup.find(({ roomID }) => { return roomID === socket.roomID });

				if (player === findRoom.guesser) {

					findRoom.guesser = "";
					findRoom.guesserID = "";
					findRoom.setGuesser = false;

				}

				// console.log(findRoom);

				io.to(socket.roomID).emit("leftRoom", player);

				return true;

			} else {

				return false;

			}

		});

	});

	socket.on("sendMessage", (roomName, messageData) => {

		socket.to(roomName).emit("receiveMessage", messageData);

	});

	socket.on("newUsername", (roomID, prevUsername, newUsername) => {

		socket.to(roomID).emit("getNewUsername", prevUsername, newUsername);

	});

	socket.on("startGame", (selectedPlayers, joinOrder) => {

		// console.log(selectedPlayers);

		const findRoom = roomLookup.find(({ roomID }) => { return roomID === socket.roomID });

		findRoom.isGameStarted = true;
		findRoom.prevAiPlayers = findRoom.aiPlayers;

		// if (findRoom.numPlayers === 1) {

		// 	findRoom.aiPlayers = 2;

		// } else if (findRoom.numPlayers === 2) {

		// 	findRoom.aiPlayers = 1;

		// } else {

		// 	findRoom.aiPlayers = 0;

		// }

		// get all socketIDs in lobby as strings
		const socketsInLobby = [...io.sockets.adapter.rooms.get(socket.roomID)];

		const usernames = socketsInLobby.map((socketID) => {

			// use those strings to get the actual socket objects
			const foundSocket = io.sockets.sockets.get(socketID);

			return {

				// extract out the usernames for each socket
				username: foundSocket.username,
				socketID: socketID

			}

		});

		// choose a guesser
		if (findRoom.guesser === "" && findRoom.guesserID === "") {

			console.log("none selected");

			// console.log(findRoom);

			const index = Math.floor(Math.random() * selectedPlayers.length);

			const guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

			findRoom.guesser = guesser.username;
			findRoom.guesserID = guesser.socketID;

		} else if (findRoom.setGuesser) {

			console.log(findRoom.guesser + " selected");
			
			// console.log(findRoom);

			findRoom.setGuesser = false;

			if (!selectedPlayers.includes(findRoom.guesser)) {

				const index = Math.floor(Math.random() * selectedPlayers.length);

				const guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

				findRoom.guesser = guesser.username;
				findRoom.guesserID = guesser.socketID;

			}

		} else {

			let index = 0;
			let guesser = {};

			do {

				index = Math.floor(Math.random() * selectedPlayers.length);

				guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

				console.log(guesser.username, "is the new randomly selected guesser");

			} while (findRoom.guesserID === guesser.socketID);

			findRoom.guesser = guesser.username;
			findRoom.guesserID = guesser.socketID;

		}

		const callsign = getMysteryWord();

		// then look at all the selected players
		selectedPlayers.forEach((playerName) => {

			// get each selected player's socketID
			const socketInfo = usernames.find(({ username }) => { return username === playerName });

			socket.to(socketInfo.socketID).emit("redirectGame", socket.roomID, playerName, selectedPlayers, callsign, false);

		});

		// set host info
		socket.emit("redirectGame", socket.roomID, socket.username, selectedPlayers, callsign, true);

	});

	socket.on("sendCallsign", (callsign, generatedWords) => {

		io.to(socket.roomID).emit("receiveCallsign", callsign, generatedWords);

	});

	socket.on("submitHint", (roomID, playerName, hint) => {

		io.to(roomID).emit("receiveHint", playerName, hint);

	});

	socket.on("submitVote", (roomID, playerName, results, voted) => {

		io.to(roomID).emit("receiveVote", playerName, results, voted);

	});

	socket.on("returnToLobby", (roomID, playerName) => {

		console.log(`${playerName} is returning to lobby`);

		let roomName = roomID === null ? socket.roomID : roomID;

		const findRoom = roomLookup.find((room) => { return room.roomID === roomName });

		io.to(roomName).emit("notifyReturnToLobby", playerName);

		if (playerName === findRoom.guesser) {

			socket.to(roomName).emit("guesserDisconnected", playerName, true);

		}

		if (roomID === null) {

			socket.emit("navigateLobby", socket.roomID, findRoom.host);

		}

	});

	socket.on("newHostNotified", (roomID) => {

		const findRoom = roomLookup.find((room) => { return room.roomID === roomID });

		findRoom.newHostAssigned = false;

	});

	socket.on("gameEnded", () => {

		const findRoom = roomLookup.find((room) => { return room.roomID === socket.roomID});

		if (findRoom) {

			findRoom.isGameStarted = false;

			const roomList = getPlayersInLobby(socket.roomID);
	
			io.to(socket.roomID).emit("updateRoomInfo", `${liveURL}/lobby/${socket.roomID}`, roomList, socket.roomID, findRoom);

		} else {

			console.log("could not find room");

		}
	});

	// update guesser live guess for all users, listen for sendGuess
	socket.on("sendGuess", (roomID, guess) => {
		socket.to(roomID).emit("receiveGuess", guess);
	});

	// guesser submitted a valid guess
	socket.on("submitGuess", (roomID, isCorrect) => {
		io.to(roomID).emit("receiveSubmitGuess", isCorrect);
	});

	socket.on("sendToggle", (roomID, readyState) => {
		io.to(roomID).emit("receiveToggle", readyState);
	});

	socket.on("updateScore", (roomID, playerName, newScore) => {
		io.to(roomID).emit("receiveUpdateScore", playerName, newScore);
	});

	socket.on("sendHintArray", (roomID, hintArray) => {
		io.to(roomID).emit("receiveHintArray", hintArray);
	})

	socket.on("setNextSlide", (roomID) => {
		io.to(roomID).emit("receiveNextSlide");
	});

	// host only
	socket.on("selectNextGuesser", (roomID, selectedPlayers, joinOrder) => {

		const findRoom = roomLookup.find((room) => { return room.roomID === roomID });

		// select next guesser
		// get all socketIDs in lobby as strings
		const socketsInLobby = [...io.sockets.adapter.rooms.get(roomID)];

		const usernames = socketsInLobby.map((socketID) => {

			// use those strings to get the actual socket objects
			const foundSocket = io.sockets.sockets.get(socketID);

			return {

				// extract out the usernames for each socket
				username: foundSocket.username,
				socketID: socketID

			}

		});

		// choose a guesser
		if (findRoom.guesser === "" && findRoom.guesserID === "") {

			console.log("next round: none selected");

			// console.log(findRoom);

			const index = Math.floor(Math.random() * selectedPlayers.length);

			const guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

			findRoom.guesser = guesser.username;
			findRoom.guesserID = guesser.socketID;

		// } else if (findRoom.setGuesser) {

		// 	console.log(findRoom.guesser + " selected");
			
		// 	console.log(findRoom);

		// 	findRoom.setGuesser = false;

		// 	if (!selectedPlayers.includes(findRoom.guesser)) {

		// 		const index = Math.floor(Math.random() * selectedPlayers.length);

		// 		const guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

		// 		findRoom.guesser = guesser.username;
		// 		findRoom.guesserID = guesser.socketID;

		// 	}

		} else {

			const selectedInOrder = joinOrder.filter((playerName) => { return selectedPlayers.includes(playerName) });

			const prevGuesserIndex = selectedInOrder.findIndex((playerName) => { return playerName === findRoom.guesser });

			// console.log(prevGuesserIndex);

			if (prevGuesserIndex !== -1) {

				const currentGuesser = usernames.find(({ username }) => { return username === selectedInOrder[(prevGuesserIndex + 1) % selectedInOrder.length] });

				if (currentGuesser) {

					// next to be guesser
					findRoom.guesser = currentGuesser.username;
					findRoom.guesserID = currentGuesser.socketID;

					console.log("next round: previous guesser: " + selectedInOrder[prevGuesserIndex]);

					console.log("next round: current guesser: " + currentGuesser.username);

					// console.log(findRoom);

				} else {

					console.log("next round: currentGuesser fail");

					const index = Math.floor(Math.random() * selectedPlayers.length);

					const guesser = usernames.find(({ username }) => { return username === selectedPlayers[index] });

					findRoom.guesser = guesser.username;
					findRoom.guesserID = guesser.socketID;

				}

			} else {

				console.log("next round: prevGuesser fail");

				const prevIndex = joinOrder.findIndex((playerName) => { return playerName === findRoom.guesser });

				// console.log(joinOrder, prevIndex);

				let offset = 0;
				let guesser = {};

				do {

					offset++;

					guesser = usernames.find(({ username }) => { return username === joinOrder[(prevIndex + offset) % joinOrder.length] });

					// console.log(guesser);

				} while (!guesser || !selectedPlayers.includes(guesser.username));

				// console.log(guesser, offset, selectedPlayers, usernames);

				findRoom.guesser = guesser.username;
				findRoom.guesserID = guesser.socketID;

			}

		}

		io.to(roomID).emit("receiveNextGuesser", findRoom);

	});

	// host only
	socket.on("generateNewCallsign", () => {

		const callsign = getMysteryWord();

		socket.emit("receiveNewCallsign", callsign);

	});

	// host only
	socket.on("sendNextCallsign", (callsign, generatedWords) => {
		const roomList = getPlayersInLobby(socket.roomID);
		const findRoom = roomLookup.find((room) => { return room.roomID === socket.roomID });

		roomList.foreach((player) => {
			if (player.socketID === findRoom.guesserID)
				io.to(player.socketID).emit("receiveNextCallsign", "REDACTED", generatedWords.map(word => word === callsign ? "REDACTED" : word), player.socketID === findRoom.hostID);
			else
				io.to(player.socketID).emit("receiveNextCallsign", callsign, generatedWords, player.socketID === findRoom.hostID);
		})
	});

	// host only
	socket.on("sendNextRound", () => {

		const roomList = getPlayersInLobby(socket.roomID);

		const findRoom = roomLookup.find((room) => { return room.roomID === socket.roomID });

		io.to(socket.roomID).emit("receiveNextRound", roomList, findRoom);

	});

	socket.on("disconnecting", () => {

		const leavingRooms = [...socket.rooms];

		// console.log(leavingRooms);

		leavingRooms.forEach((room) => {

			// if you're the only one left in the room,
			if (io.sockets.adapter.rooms.get(room).size === 1) {

				// if you joined this room, deregister the room from roomLookup
				if (room !== socket.id) {
					
					roomLookup = roomLookup.filter(({ roomID }) => { return roomID !== room });

					console.log("removed room from roomLookup");

				} else {

					// console.log("I was the last one here but this was my own room that no one joined");

				}

			} else {

				// ---------------------------------------------------------
				socket.to(room).emit("leftRoom", socket.username);
				// ---------------------------------------------------------

				const findRoom = roomLookup.find(({ roomID }) => { return roomID === room });

				if (findRoom) {

					if (socket.username === findRoom.guesser) {

						socket.to(room).emit("guesserDisconnected", socket.username, false);
	
					}
	
					// if you're the host
					if (findRoom.hostID === socket.id) {
	
						const socketsInLobby = [...io.sockets.adapter.rooms.get(socket.roomID)];
	
						const newHostSocketID = socketsInLobby.find((playerSocket) => { return playerSocket !== socket.id });
	
						const foundSocket = io.sockets.sockets.get(newHostSocketID);
	
						findRoom.host = foundSocket.username;
						findRoom.hostID = foundSocket.id;
						findRoom.newHostAssigned = true;
	
						if (!findRoom.isGameStarted) {
	
							socket.to(foundSocket.id).emit("newHost");
	
						} else {

							socket.to(room).emit("receiveNewHost", findRoom);

						}
					}
					
				}

			}

		});

	});

	socket.on("disconnect", () => {

		// console.log(roomLookup);

		console.log("User Disconnected: ", socket.id);

	});

});
