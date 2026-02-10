use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};

use crate::events::ClientMessage;
use crate::Games;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(games): State<Games>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, games))
}

async fn handle_socket(socket: WebSocket, _games: Games) {
    let (mut sender, mut receiver) = socket.split();

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            // Parse client message
            if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                println!("Received: {:?}", client_msg);

                // TODO: Process game action
                // For now, just echo back
                let response = serde_json::json!({
                    "type": "GameStateUpdate",
                    "payload": {
                        "message": "Received"
                    }
                });

                if let Ok(response_text) = serde_json::to_string(&response) {
                    let _ = sender.send(Message::Text(response_text.into())).await;
                }
            }
        }
    }
}
