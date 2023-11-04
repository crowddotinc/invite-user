import defaultOptions from "./options.js";
import toggleDisplay from "../toggleDisplay.js";
import extend from "../extend/extend.js";
import { Dropdown } from "../dropdown/dropdown.js";
import '../vanilla-toast.js'

export default class InviteUser {
    static initClass() {

    }
    constructor(el, options) {
        this.element = el;

        if (typeof this.element === "string") {
            this.element = document.querySelector(this.element);
        }

        // Not checking if instance of HTMLElement or Element since IE9 is extremely weird.
        if (!this.element || this.element.nodeType == null) {
            throw new Error("Invalid element.");
        }

        if (this.element.InviteUser) {
            throw new Error("already attached.");
        }

        this.element.InviteUser = this;

        this.options = extend(
            {},
            defaultOptions,
            options
        );

        if (!this.options.url) {
            throw new Error("No URL provided.");
        }

        //if form element and hidden element not attached
        if (!this.options.hiddenFormElementSelector && !this.options.formSelector) {
            throw new Error("Must Add hiden form element or form selector");
        }

        if (this.options.formSelector) {
            this.formElement = document.querySelector(this.options.formSelector);
        }

        // If the browser failed, just call the fallback and leave
        if (this.options.forceFallback || !InviteUser.isBrowserSupported()) {
            return this.options.fallback.call(this);
        }

        this.invitedUserJson = { 'users': [] };
        this.id = 0;

        this.init();
    }
    init() {
        //create hidden element if doesn't exist
        if (!document.querySelector(this.options.hiddenFormElementSelector)) {
            this.hiddenFormElement = document.createElement('input');
            this.hiddenFormElement.type = 'hidden';
            this.hiddenFormElement.name = 'invited_users';

            this.element.appendChild(this.hiddenFormElement); //or container append like this.element.appendChild()
        }
        else {
            this.hiddenFormElement = document.querySelector(this.options.hiddenFormElementSelector);
        }
        //username input section
        let usernameInput = document.createElement('input')
        usernameInput.type = 'text';
        usernameInput.className = 'form-control';
        usernameInput.placeholder = 'Type in username';
        usernameInput.autocomplete = 'off';

        usernameInput.addEventListener('keydown', this.usernameEvent.bind(this));

        this.usernameInput = usernameInput;
        this.element.appendChild(this.usernameInput);

        //dropdown seciton
        this.dropdown = new Dropdown(this.element, { 'clickFunc': this.clickDropdownItem.bind(this) });

        var timer = setTimeout('', 1);
        this.timer = timer;

        //selected user section
        let selectedUserSection = document.createElement('div');
        selectedUserSection.className = 'selected-user-section';
        this.selectedUserSection = selectedUserSection;
        this.element.appendChild(selectedUserSection);

        if (this.options.source && this.options.source != "False") { //for python
            this.options.source.users.forEach(user => {
                this.addUserToSelectedSection(user.username, user.image_file, user.permission);
            });
            this.selectedUserSection.style.display = 'flex';
            this.element.style.display = 'block';
        }
    }

    clickDropdownItem(menuItem) {
        this.dropdown.Hide();
        if (this.invitedUserJson.users.length == 0) {
            this.selectedUserSection.style.display = 'flex';
        }

        const username = menuItem.getAttribute('data-username')
        const image_url = menuItem.getAttribute('data-image-url');

        if (!this.isUserAdded(username)) {
            this.addUserToSelectedSection(username, image_url, 'view'); //default perm is view maybe option
            this.updateFormState();

        } else {
            vt.error("User Aldredy Added", { position: 'top-right' });
        }
    }

    //permision view or editor
    addUserToSelectedSection(username, image_url, permission) {
        this.invitedUserJson.users.push({ 'username': username, 'permission': permission });
        this.usernameInput.value = '';

        let element = InviteUser.createInventedUserElement(this.id, username, image_url);

        let crossImg = Flask.url_for('static', { 'filename': 'icons/cross_white.svg' });
        let img = document.createElement('img');
        img.src = crossImg;
        img.addEventListener('click', this.deleteInvitebyUser.bind(this, username, this.id));
        img.style.cursor = 'pointer';
        element.append(img);

        var permissionOption = element.querySelector('.permission-option');
        var permissionStatus = element.querySelector('.permission-status');

        if (permission == 'editor') {
            permissionStatus.innerHTML = permissionStatus.innerHTML.replace('View Only','Editor');
            permissionOption.innerHTML = 'View Only'
        }
        
        permissionStatus.addEventListener('click', this.permissionStatusClick.bind(this, permissionOption, permissionStatus));
        permissionOption.addEventListener('click', this.permissionOptionClick.bind(this, permissionOption, permissionStatus, username));

        document.addEventListener("click", (event) => {
            if (permissionOption && permissionStatus) {
                const isClickPermissionOption = permissionOption.contains(event.target);
                const isClickPermissionStatus = permissionStatus.contains(event.target);

                if (!isClickPermissionOption && !isClickPermissionStatus) {
                    permissionOption.style.display = 'none';
                    this.addBorder(permissionStatus);
                }
            }
        });
        this.selectedUserSection.appendChild(element);
        this.id++;
    }

    permissionOptionClick(permissionOption, permissionStatus, username) {
        toggleDisplay(permissionOption);
        this.addBorder(permissionStatus);
        this.changePermission(username);

        let text = permissionStatus.querySelector('p');
        if (text.innerHTML.trim() == 'View Only') {
            text.innerHTML = 'Editor';
        }
        else {
            text.innerHTML = 'View Only';
        }

        if (permissionOption.innerHTML.trim() == 'View Only') {
            permissionOption.innerHTML = 'Editor';
        }
        else {
            permissionOption.innerHTML = 'View Only';
        }
    }

    changePermission(username) {
        this.invitedUserJson.users.forEach(user => {
            if (user.username == username) {

                user.permission = InviteUser.togglePermission(user.permission);
            }
        });
        this.updateFormState();
    }

    permissionStatusClick(permissionOption, permissionStatus) {
        toggleDisplay(permissionOption);
        this.clearBorder(permissionStatus);
        if (permissionOption.style.display == 'none') {
            this.addBorder(permissionStatus);
        }
    }

    addBorder(permissionStatus) {
        permissionStatus.style.borderBottomLeftRadius = '1rem';
        permissionStatus.style.borderBottomRightRadius = '1rem';
    }

    clearBorder(permissionStatus) {
        permissionStatus.style.borderBottomLeftRadius = '0';
        permissionStatus.style.borderBottomRightRadius = '0';
    }

    usernameEvent(event) {
        clearTimeout(this.timer);

        if (InviteUser.isLetter(event) && (!InviteUser.isAllText(event))) {
            this.dropdown.Hide();
            this.dropdown.Clear();
        }

        this.timer = setTimeout(this.endOfTyping.bind(this, event), this.options.keyDownTimer);
    }

    endOfTyping(event) {
        var text = this.usernameInput.value;

        if (text.length > 1 && InviteUser.isLetter(event) && (!InviteUser.isAllText(event))) {
            let payload = { 'search': text };

            fetch(this.options.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.users.length > 0) {
                        this.dropdown.Show();
                        this.dropdown.SetItems(data.users);
                    }
                })
                .catch((error) => {
                    console.error(error);
                    alert('Couldnt send request. Try again later.');
                });
        }
    }

    isUserAdded(username) {
        return this.getUserBy(username) !== undefined;
    }

    getUserBy(username) {
        return this.invitedUserJson.users.find(user => user.username == username);
    }

    updateFormState() {
        this.hiddenFormElement.value = JSON.stringify(this.invitedUserJson);
    }

    deleteUserFromList(username) {
        this.invitedUserJson.users = this.invitedUserJson.users.filter(user => user.username != username);
    }

    deleteInvitebyUser(username, id) {
        this.deleteUserFromList(username);

        let element = document.querySelector('#user_invite_id_' + id);
        element.remove();

        if (this.invitedUserJson.users.length < 1) {
            this.selectedUserSection.style.display = 'none';
        }

        this.updateFormState();
    }
}
InviteUser.initClass();

InviteUser.blockedBrowsers = [
    /opera.*(Macintosh|Windows Phone).*version\/12/i,
];

InviteUser.isLetter = function (event) {
    let keyCodes = [192, 9, 20, 16, 17, 91, 18, 32, 18, 92, 93];
    return !keyCodes.includes(event.keyCode);
}

InviteUser.isAllText = function (event) {
    return (event.ctrlKey || event.metaKey) && event.keyCode == 65;
}

InviteUser.togglePermission = function (str) {
    let perm = { 'view': 'editor', 'editor': 'view' };
    return perm[str]
}

InviteUser.createInventedUserElement = function (id, username, image_url) {
    let container = document.createElement('div');
    container.className = 'invited-user-item';
    container.id = 'user_invite_id_' + id;

    let item = Dropdown.createMenuItem({ 'username': username, 'image_file': image_url });
    container.appendChild(item);

    let select_string = `<div style="margin-left: auto;">
    <div class="permission-status">
        <p class="permission-status-p m0">
            View Only
        </p>
        <img class="ml-auto" style="width:unset;height:unset; margin:0;" src="${Flask.url_for('static', { 'filename': 'icons/comment-show.svg' })}">
    </div>
    <div class="permission-option" data-username='${username}'>
        Editor
    </div>
    </div>`;

    let select = InviteUser.createElement(select_string);
    container.appendChild(select);

    return container;
}

InviteUser.createElement = function (string) {
    let div = document.createElement("div");
    div.innerHTML = string;
    return div.childNodes[0];
}

InviteUser.isBrowserSupported = function () {
    let capableBrowser = true;

    if (
        window.FormData &&
        document.querySelector
    ) {
        if (!("classList" in document.createElement("a"))) {
            capableBrowser = false;
        } else {
            if (InviteUser.blacklistedBrowsers !== undefined) {
                InviteUser.blockedBrowsers = InviteUser.blacklistedBrowsers;
            }
            for (let regex of InviteUser.blockedBrowsers) {
                if (regex.test(navigator.userAgent)) {
                    capableBrowser = false;
                    continue;
                }
            }
        }
    } else {
        capableBrowser = false;
    }

    return capableBrowser;
};

export { InviteUser }