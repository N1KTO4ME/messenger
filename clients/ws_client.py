import asyncio
import websockets

async def chat_client(user_id: int):
    uri = f"ws://127.0.0.1:8000/ws/{user_id}"  # Адрес WebSocket-сервера
    async with websockets.connect(uri) as websocket:
        print(f"Подключен как пользователь {user_id}")

        async def receive_messages():
            while True:
                message = await websocket.recv()
                print(f"\nПолучено сообщение: {message}")

        asyncio.create_task(receive_messages())  # Запускаем получение сообщений

        while True:
            msg = input("Введите сообщение: ")
            await websocket.send(msg)

if __name__ == "__main__":
    user_id = int(input("Введите свой ID: "))
    asyncio.run(chat_client(user_id))
