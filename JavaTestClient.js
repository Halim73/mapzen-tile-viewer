var connection = new WebSocket('ws://127.0.0.1:4444');

connection.onopen = function () {
    console.log('Connected!');
    connection.send('Ping'); // Send the message 'Ping' to the server
};

// Log errors
connection.onerror = function (error) {
    console.log('WebSocket Error ' + error);
};

// Log messages from the server
connection.onmessage = function (e) {
	var JSONdata = JSON.parse(e.data);
	var data = JSONdata.Data;
	console.log(data);
	console.log(data[0]);
	//console.log('Age: ' + JSONdata.age);
};