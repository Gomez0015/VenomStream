// Get the navbar
var navbar = document.getElementById("navbar");

var html = document.getElementsByTagName("html");

// Get the offset position of the navbar
var sticky = navbar.offsetTop;

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
window.onscroll = function myFunction() {
    if (window.pageYOffset > sticky) {
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}


// Get a Modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("addMovieIcon");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
if (btn != undefined) {
    btn.onclick = function() {
        modal.style.display = "block";
    }
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
        modal.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function playMovie(index) {
    document.getElementById("myModal" + index).style.display = "block";
}

function playSeries(title, element) {
    var sodaplayerUrl = "sodaplayer:?url=" + encodeURIComponent(element.value);

    if (title) {
        sodaplayerUrl += "&title=" + encodeURIComponent(title);
    }

    window.open(sodaplayerUrl);
}

function favoriteMovie(element, title) {
    if ($("#" + element.id).hasClass("far")) {
        $("#" + element.id).removeClass("far");
        $("#" + element.id).addClass("fas");

        $.post("/app/addfavorite", { movie: title, action: "add" }, function(data, status) {
            console.log("Data: " + data + "\nStatus: " + status);
        });
    } else {
        $("#" + element.id).removeClass("fas");
        $("#" + element.id).addClass("far");

        $.post("/app/addfavorite", { movie: title, action: "remove" }, function(data, status) {
            console.log("Data: " + data + "\nStatus: " + status);
        });
    }

    if (window.location.href.includes("listFavorites")) {
        location.reload();
    }
}

function switchClass(element) {
    if ($(element)[0].classList.value.includes("far")) {
        $(element).removeClass("far");
        $(element).addClass("fas");
    } else if ($(element)[0].classList.value.includes("fas")) {
        $(element).removeClass("fas");
        $(element).addClass("far");
    }
}
var colorPicker1 = document.getElementById("colorPicker1");
var colorPicker2 = document.getElementById("colorPicker2");

colorPicker1.addEventListener("click", function(e) {
    console.log(colorPicker1.style.color);
    changeTheme(colorPicker1.style.color);
    e.preventDefault();
});

colorPicker2.addEventListener("click", function(e) {
    console.log(colorPicker2.style.color);
    changeTheme(colorPicker2.style.color);
    e.preventDefault();
});

switch ($(html)[0].classList.value) {
    case "blueColors":
        colorPicker1.style.color = "#e6002e";
        colorPicker2.style.color = "#00e676";
        break;
    case "greenColors":
        colorPicker1.style.color = "#00e5ff";
        colorPicker2.style.color = "#e6002e";
        break;
    case "redColors":
        colorPicker1.style.color = "#00e676";
        colorPicker2.style.color = "#00e5ff";
        break;
    default:
        break;
}

function changeTheme(color) {
    switch (color) {
        case "rgb(230, 0, 46)":
            $(html).removeClass();
            $(html).addClass("redColors");
            $.post("/app/setThemeColor", { color: "redColors" }, function(data, status) {
                console.log("Data: " + data + "\nStatus: " + status);
            });
            break;
        case "rgb(0, 229, 255)":
            $(html).removeClass();
            $(html).addClass("blueColors");
            $.post("/app/setThemeColor", { color: "blueColors" }, function(data, status) {
                console.log("Data: " + data + "\nStatus: " + status);
            });
            break;
        case "rgb(0, 230, 118)":
            $(html).removeClass();
            $(html).addClass("greenColors");
            $.post("/app/setThemeColor", { color: "greenColors" }, function(data, status) {
                console.log("Data: " + data + "\nStatus: " + status);
            });
            break;
        default:
            break;
    }

    switch ($(html)[0].classList.value) {
        case "blueColors":
            colorPicker1.style.color = "#e6002e";
            colorPicker2.style.color = "#00e676";
            break;
        case "greenColors":
            colorPicker1.style.color = "#00e5ff";
            colorPicker2.style.color = "#e6002e";
            break;
        case "redColors":
            colorPicker1.style.color = "#00e676";
            colorPicker2.style.color = "#00e5ff";
            break;
        default:
            break;
    }
}

function checkOverflowWithParent(el) {
    var rect = el.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    return (
        (rect.x + rect.width) > vw
    );
}

function categorySlide(direction, categoryName) {
    console.log(direction, categoryName);
    var liToSlide = document.getElementById(categoryName);
    switch (direction) {
        case 'left':
            // for (var i = 0; i < liToSlide.getElementsByTagName("li").length; i++) {
            //     var overflowing = checkOverflowWithParent(liToSlide.getElementsByTagName("li")[i]);
            //     if (overflowing) {
            //         liToSlide.appendChild(liToSlide.getElementsByTagName("li")[0]);
            //         i = liToSlide.getElementsByTagName("li").length;
            //     }
            // }
            liToSlide.appendChild(liToSlide.getElementsByTagName("li")[0]);
            break;
        case 'right':
            // for (var i = 0; i < liToSlide.getElementsByTagName("li").length; i++) {
            //     var overflowing = checkOverflowWithParent(liToSlide.getElementsByTagName("li")[i]);
            //     if (overflowing) {
            //         liToSlide.insertBefore(liToSlide.getElementsByTagName("li")[i], liToSlide.getElementsByTagName("li")[0]);
            //         i = liToSlide.getElementsByTagName("li").length;
            //     }
            // }
            liToSlide.insertBefore(liToSlide.getElementsByTagName("li")[liToSlide.getElementsByTagName("li").length - 1], liToSlide.getElementsByTagName("li")[0]);
            break;
        default:
            break;
    }
}