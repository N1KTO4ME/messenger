const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("darkTheme") === "true") {
    document.body.classList.add("dark-theme");
    themeToggle.textContent = "☀️ Светлая тема";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDarkTheme = document.body.classList.contains("dark-theme");
    localStorage.setItem("darkTheme", isDarkTheme);
    themeToggle.textContent = isDarkTheme ? "☀️ Светлая тема" : "🌙 Темная тема";

    // Применяем тему к другим элементам
    const chatList = document.querySelector('.chat-list');
    if (chatList) {
        chatList.classList.toggle("dark-theme");
    }
});
