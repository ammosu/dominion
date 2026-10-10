use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use shared::protocol::ServerMessage;
use shared::session::Session;

#[derive(Deserialize)]
pub struct WsQuery {
    #[serde(default = "default_difficulty")]
    difficulty: String,
    /// A recommended set id, "random", or a comma-separated list of 10 card ids.
    #[serde(default)]
    kingdom: Option<String>,
    #[serde(default)]
    name: Option<String>,
    /// The AI opponent's name.
    #[serde(default)]
    opponent: Option<String>,
}

fn default_difficulty() -> String {
    "medium".to_string()
}

pub async fn websocket_handler(ws: WebSocketUpgrade, Query(query): Query<WsQuery>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, query))
}

async fn send(sender: &mut futures_util::stream::SplitSink<WebSocket, Message>, message: ServerMessage) -> bool {
    match serde_json::to_string(&message) {
        Ok(text) => sender.send(Message::Text(text.into())).await.is_ok(),
        Err(_) => false,
    }
}

async fn handle_socket(socket: WebSocket, query: WsQuery) {
    let (mut sender, mut receiver) = socket.split();
    let mut session = Session::new(
        &query.difficulty,
        query.kingdom.as_deref(),
        query.name.as_deref(),
        query.opponent.as_deref(),
    );
    println!("WebSocket connected: AI {}, kingdom {:?}", session.ai_name(), session.kingdom());

    if !send(&mut sender, session.start()).await {
        return;
    }
    while let Some(Ok(message)) = receiver.next().await {
        let Message::Text(text) = message else {
            continue;
        };
        let reply = session.handle(&text);
        if let Some(error) = &reply.payload.error {
            eprintln!("Rejected client message: {error}");
        }
        if !send(&mut sender, reply).await {
            break;
        }
    }
}
