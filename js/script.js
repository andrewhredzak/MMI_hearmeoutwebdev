document.addEventListener('DOMContentLoaded', function() {
    // Get all buttons and pages
    const menuButton = document.getElementById('menu-button');
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const playButton = document.getElementById('play-button');
    
    const pages = document.querySelectorAll('.screen-content');
    let currentPageIndex = 0;
    
    // Function to show a specific page with slide transition
    function showPage(index) {
        // Determine direction of slide
        const direction = index > currentPageIndex ? 'right' : 'left';
        
        // Hide current page with appropriate slide direction
        if (direction === 'right') {
            pages[currentPageIndex].classList.add('slide-left');
        } else {
            pages[currentPageIndex].classList.remove('active');
        }
        
        // Update current page index
        const previousPageIndex = currentPageIndex;
        currentPageIndex = index;
        
        // Make sure index is within bounds (circular navigation)
        if (currentPageIndex >= pages.length) {
            currentPageIndex = 0;
        } else if (currentPageIndex < 0) {
            currentPageIndex = pages.length - 1;
        }
        
        // Remove active class from all pages
        pages.forEach(page => {
            if (page !== pages[previousPageIndex]) {
                page.classList.remove('active');
                page.classList.remove('slide-left');
            }
        });
        
        // Position the new page for entrance
        if (direction === 'right') {
            pages[currentPageIndex].style.transform = 'translateX(100%)';
        } else {
            pages[currentPageIndex].style.transform = 'translateX(-100%)';
        }
        
        // Force reflow to ensure the transform is applied before transition
        void pages[currentPageIndex].offsetWidth;
        
        // Show new page with transition
        pages[currentPageIndex].classList.add('active');
        pages[currentPageIndex].style.transform = '';
        
        // Clean up previous page after transition
        setTimeout(() => {
            pages[previousPageIndex].classList.remove('slide-left');
            pages[previousPageIndex].classList.remove('active');
        }, 500);
    }
    
    // Add click event listeners to buttons
    menuButton.addEventListener('click', function() {
        showPage(0); // MADMANINDUSTRIES page
    });
    
    leftButton.addEventListener('click', function() {
        showPage(1); // ANDREW page
    });
    
    rightButton.addEventListener('click', function() {
        showPage(2); // PRODUCTS page
    });
    
    playButton.addEventListener('click', function() {
        showPage(3); // PROJECTS page
    });
});
