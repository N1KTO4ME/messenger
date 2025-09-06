function toggleForms() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');

    // Очищаем сообщения об ошибках при переключении
    document.getElementById('login-error-message').textContent = '';
    document.getElementById('register-error-message').textContent = '';

    loginContainer.style.display = loginContainer.style.display === 'none' ? 'block' : 'none';
    registerContainer.style.display = registerContainer.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMessageDiv = document.getElementById('login-error-message');
    errorMessageDiv.textContent = '';

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch('/api/users/token', { method: 'POST', body: formData });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.access_token);
            window.location.href = '/chat';
        } else {
            const errorData = await response.json();
            errorMessageDiv.textContent = errorData.detail || 'Ошибка входа.';
        }
    } catch (error) {
        errorMessageDiv.textContent = 'Ошибка сети. Попробуйте снова.';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('registerFullName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    const errorMessageDiv = document.getElementById('register-error-message');
    errorMessageDiv.textContent = '';

    const payload = { full_name: fullName, email, password, role };

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const errorData = await response.json(); // Считываем ответ в любом случае

        if (response.ok) {
            alert('Регистрация прошла успешно! Теперь вы можете войти.');
            toggleForms();
        } else {
            if (errorData.detail && Array.isArray(errorData.detail)) {
                // Это ошибка валидации от FastAPI (422)
                const firstError = errorData.detail[0];
                const field = firstError.loc.length > 1 ? firstError.loc[1] : 'общая';
                const message = firstError.msg;
                // Более понятное сообщение
                errorMessageDiv.textContent = `Ошибка в поле '${field}': ${message}`;
            } else if (errorData.detail) {
                // Это обычная ошибка HTTPException (например, 400)
                errorMessageDiv.textContent = errorData.detail;
            } else {
                errorMessageDiv.textContent = 'Произошла неизвестная ошибка регистрации.';
            }
        }
    } catch (error) {
        errorMessageDiv.textContent = 'Ошибка сети. Попробуйте снова.';
    }
});