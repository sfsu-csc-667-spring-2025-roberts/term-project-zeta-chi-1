// public/js/home.js

// Dropdown Menu
document.addEventListener('DOMContentLoaded', () => {
    const accountIcon = document.getElementById('account-icon');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutLink = document.getElementById('logout-link');

    if (accountIcon && dropdownMenu) {
        accountIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevents click from closing menu too fast
            dropdownMenu.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!dropdownMenu.contains(event.target) && !accountIcon.contains(event.target)) {
                if (!dropdownMenu.classList.contains('hidden')) {
                    dropdownMenu.classList.add('hidden');
                }
            }
        });
    }


    // Logout logic
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json'
                    },
                });

                if (response.ok) { // Log out was successful
                    window.location.href = '/index?loggedout=true';
                } else { // Log out error
                    console.error('Logout failed:', response.statusText);
                    const msgDiv = document.createElement('div');
                    msgDiv.textContent = 'Logout failed. Please try again.';
                    msgDiv.style.color = 'red';
                    msgDiv.style.marginTop = '10px';
                    document.querySelector('.container')?.appendChild(msgDiv); // Append error msg
                    setTimeout(() => msgDiv.remove(), 3000);
                }
            } catch (error) {
                console.error('Error during logout:', error);
                 const msgDiv = document.createElement('div');
                 msgDiv.textContent = 'An error occurred during logout.';
                 msgDiv.style.color = 'red';
                 msgDiv.style.marginTop = '10px';
                 document.querySelector('.container')?.appendChild(msgDiv); // Append error msg
                 setTimeout(() => msgDiv.remove(), 3000);
            }
        });
    }
});