document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // --- DOM Elements ---
    const profileForm = document.getElementById('profileForm');
    const fullNameInput = document.getElementById('profileFullName');
    const emailInput = document.getElementById('profileEmail');
    const logoutButton = document.getElementById('logoutButton');
    const errorMessageDiv = document.getElementById('profile-error-message');
    const successMessageDiv = document.getElementById('profile-success-message');
    const profileHeader = document.getElementById('profileHeader'); // НОВОЕ

    // --- Load user data ---
    async function loadProfile() {
        try {
            const response = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const user = await response.json();
                fullNameInput.value = user.full_name;
                emailInput.value = user.email;
                // НОВОЕ: Обновляем заголовок с именем пользователя
                profileHeader.textContent = `Профиль: ${user.full_name}`;
            } else {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        } catch (error) {
            errorMessageDiv.textContent = 'Ошибка сети при загрузке профиля.';
        }
    }

    // --- Handle form submission ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.textContent = '';
        successMessageDiv.textContent = '';

        const payload = {
            full_name: fullNameInput.value,
            email: emailInput.value
        };

        try {
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json(); // Считываем ответ в любом случае

            if (response.ok) {
                successMessageDiv.textContent = 'Профиль успешно обновлен!';
                // Обновляем имя в заголовке, если оно изменилось
                profileHeader.textContent = `Профиль: ${responseData.full_name}`;
                setTimeout(() => successMessageDiv.textContent = '', 3000);
            } else {
                // ИЗМЕНЕНО: Улучшенная обработка ошибок
                if (responseData.detail && Array.isArray(responseData.detail)) {
                    // Ошибка валидации 422
                    const firstError = responseData.detail[0];
                    errorMessageDiv.textContent = `Ошибка в поле '${firstError.loc[1]}': ${firstError.msg}`;
                } else if (responseData.detail) {
                    // Ошибка HTTPException (например, 400 или 401)
                    errorMessageDiv.textContent = responseData.detail;
                } else {
                    errorMessageDiv.textContent = 'Произошла неизвестная ошибка.';
                }
            }
        } catch (error) {
            errorMessageDiv.textContent = 'Ошибка сети при обновлении профиля.';
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
    });

    // --- Initial Load ---
    await loadProfile();
});