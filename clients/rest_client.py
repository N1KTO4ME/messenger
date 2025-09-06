import requests

BASE_URL = "http://127.0.0.1:8000"

def register(username: str, password: str):
    response = requests.post(f"{BASE_URL}/users/register", json={"username": username, "password": password})
    print(response.json())

def login(username: str, password: str):
    response = requests.post(f"{BASE_URL}/users/login", json={"username": username, "password": password})
    print(response.json())

def send_message(sender_id: int, receiver_id: int, content: str):
    response = requests.post(f"{BASE_URL}/messages/", json={
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "content": content
    })
    print(response.json())

def get_messages(user_id: int):
    response = requests.get(f"{BASE_URL}/messages/{user_id}")
    print(response.json())

if __name__ == "__main__":
    while True:
        print("\n1. Регистрация\n2. Вход\n3. Отправить сообщение\n4. Получить сообщения\n5. Выход")
        choice = input("Выберите действие: ")

        if choice == "1":
            username = input("Введите имя пользователя: ")
            password = input("Введите пароль: ")
            register(username, password)

        elif choice == "2":
            username = input("Введите имя пользователя: ")
            password = input("Введите пароль: ")
            login(username, password)

        elif choice == "3":
            sender = int(input("Ваш ID: "))
            receiver = int(input("ID получателя (0 для публичного чата): ")) or None
            content = input("Сообщение: ")
            send_message(sender, receiver, content)

        elif choice == "4":
            user_id = int(input("Введите ваш ID: "))
            get_messages(user_id)

        elif choice == "5":
            break
