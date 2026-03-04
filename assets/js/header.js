function toggleMobileMenu() {
    const mainNav = document.getElementById('mainNav');
    mainNav.classList.toggle('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mainNav = document.getElementById('mainNav');
    const mobileToggle = document.querySelector('.mobile-toggle');

    if (!mainNav.contains(event.target) && !mobileToggle.contains(event.target)) {
        mainNav.classList.remove('active');
    }
});

// Active state management
document.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
    link.addEventListener('click', function(e) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));

        // Add active class to clicked item (or parent if dropdown item)
        if (this.classList.contains('dropdown-item')) {
            this.closest('.nav-item').querySelector('.nav-link').classList.add('active');
        } else {
            this.classList.add('active');
        }

        console.log('Navigating to:', this.textContent.trim());
    });
});

// Enhanced dropdown interactions
document.querySelectorAll('.nav-item').forEach(item => {
    const dropdown = item.querySelector('.dropdown');
    let hoverTimeout;
    let isHovering = false;

    function showDropdown() {
        if (dropdown && !isHovering) {
            isHovering = true;
            clearTimeout(hoverTimeout);
            dropdown.style.display = 'block';
            setTimeout(() => {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
                dropdown.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            }, 10);
        }
    }

    function hideDropdown() {
        if (dropdown && isHovering) {
            isHovering = false;
            hoverTimeout = setTimeout(() => {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
                dropdown.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)';
                setTimeout(() => {
                    if (!isHovering) {
                        dropdown.style.display = 'none';
                    }
                }, 400);
            }, 150);
        }
    }

    item.addEventListener('mouseenter', showDropdown);
    item.addEventListener('mouseleave', hideDropdown);

    // Keep dropdown open when hovering over it
    if (dropdown) {
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            isHovering = true;
        });
        dropdown.addEventListener('mouseleave', hideDropdown);
    }
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('mainNav').classList.remove('active');
    }
});

// Enhanced scroll effect for fixed header
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// Ensure scroll effect is applied after header loads
document.addEventListener('DOMContentLoaded', function() {
    // Trigger scroll check after a short delay to ensure header is loaded
    setTimeout(function() {
        const header = document.querySelector('.header');
        if (header && window.scrollY > 20) {
            header.classList.add('scrolled');
        }
    }, 100);
});