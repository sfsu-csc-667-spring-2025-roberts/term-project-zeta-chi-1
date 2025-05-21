let currentCategory = 'skin';

const indexes = {
    skin: 0,
    clothes: 0,
    eyes: 0,
    head: 0,
    mouth: 0,
};

const options = {
    skin: [
        '/avatar/skins/skin2.svg',
        '/avatar/skins/skin3.svg',
        '/avatar/skins/skin4.svg',
        '/avatar/skins/skin5.svg',
    ],
    clothes: [
        '/avatar/clothes/hoodie.svg',
        '/avatar/clothes/flannel.svg',
        '/avatar/clothes/shirt.svg',
    ],
    eyes: [
        '/avatar/eyes/apathetic.svg',
        '/avatar/eyes/glasses.svg',
        '/avatar/eyes/mini-sunglasses.svg',
        '/avatar/eyes/opened-eyes.svg',
        '/avatar/eyes/simple-eyes.svg',
    ],
    head: [
        '/avatar/head/beanie.svg',
        '/avatar/head/cap.svg',
        '/avatar/head/curlyhair.svg',
        '/avatar/head/hair.svg',
        '/avatar/head/longHair.svg',
        '/avatar/head/mohawk.svg',
    ],
    mouth: [
        '/avatar/mouth/happy-mouth.png',
    ],
};

const categories = Object.keys(options);
let userData = null;

function updateOption() {
    const layerId = `${currentCategory}-layer`;
    const imgElement = document.getElementById(layerId);

    if (imgElement) {
        imgElement.onerror = function() {
            console.error(`Failed to load image: ${imgElement.src}`);
            imgElement.src = '/placeholder.svg';
        };

        const imagePath = options[currentCategory][indexes[currentCategory]];
        imgElement.src = imagePath;
        imgElement.style.display = 'block';

        console.log(`Attempting to load: ${imagePath}`);
    } else {
        console.error(`Element with ID "${layerId}" not found!`);
    }
}

function nextOption() {
    indexes[currentCategory] = (indexes[currentCategory] + 1) % options[currentCategory].length;
    updateOption();
}

function prevOption() {
    indexes[currentCategory] = (indexes[currentCategory] - 1 + options[currentCategory].length) % options[currentCategory].length;
    updateOption();
}

function confirmCategory() {
    const currentIndex = categories.indexOf(currentCategory);
    const nextIndex = currentIndex + 1;

    if (nextIndex < categories.length) {
        currentCategory = categories[nextIndex];
        document.getElementById('category-label').innerText = capitalize(currentCategory);
        updateOption();
    } else {
        const avatarData = {
            skin: options.skin[indexes.skin],
            clothes: options.clothes[indexes.clothes],
            eyes: options.eyes[indexes.eyes],
            head: options.head[indexes.head],
            mouth: options.mouth[indexes.mouth],
        };

        console.log('✅ Avatar saved!', avatarData);

        const finalUserData = {
            ...userData,
            avatar: avatarData
        };

        console.log('Complete registration data:', finalUserData);

        finalizeRegistration(finalUserData);
    }
}

function finalizeRegistration(userData) {
    document.getElementById('status-message').textContent = 'Creating your account...';
    document.getElementById('status-message').style.display = 'block';

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('status-message').textContent = 'Registration successful! Redirecting...';
                document.getElementById('status-message').className = 'success-message';
                setTimeout(() => {
                    window.location.href = '/index';
                }, 2000);
            } else {
                document.getElementById('status-message').textContent = data.message || 'Registration failed.';
                document.getElementById('status-message').className = 'error-message';
            }
        })
        .catch(error => {
            console.error('Registration Error:', error);
            document.getElementById('status-message').textContent = 'An error occurred during registration.';
            document.getElementById('status-message').className = 'error-message';
        });
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function loadUserData() {
    const registrationDataStr = sessionStorage.getItem('registrationData');
    if (registrationDataStr) {
        userData = JSON.parse(registrationDataStr);

        document.getElementById('info-first').textContent = userData.firstName;
        document.getElementById('info-last').textContent = userData.lastName;
        document.getElementById('info-email').textContent = userData.email;
    } else {
        alert('No registration data found. Please fill out the registration form first.');
        window.location.href = '/html/register.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateOption();
});