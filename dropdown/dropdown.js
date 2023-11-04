import defaultOptions from "./options.js";
import extend from "../extend/extend.js";

export default class Dropdown {
    static initClass() {
    }

    constructor(el, options) {
        this.element = el;
        this.items = []

        if (typeof this.element === "string") {
            this.element = document.querySelector(this.element);
        }

        if (!this.element || this.element.nodeType == null) {
            throw new Error("Invalid element.");
        }

        if (this.element.Dropdown) {
            throw new Error("already attached.");
        }

        this.element.Dropdown = this;

        this.options = extend(
            {},
            defaultOptions,
            options
        );
        this.init();
    }
    init() {
        let dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'invite-user-dropdown';
        dropdownMenu.style.width = '100%';
        this.element.appendChild(dropdownMenu)
        this.dropdownMenu = dropdownMenu;
    }

    Show() {
        this.dropdownMenu.style.display = 'block';
    }

    Hide() {
        this.dropdownMenu.style.display = 'none';
    }

    Clear() {
        this.dropdownMenu.innerHTML = '';
    }

    SetItems(list) {
        list.forEach(item => {
            this.AddItem(item);
        });
    }

    AddItem(valueJson) {
        let menuItem = Dropdown.createMenuItem(valueJson);
        menuItem.addEventListener('click', this.options.clickFunc.bind(this, menuItem));
        this.dropdownMenu.appendChild(menuItem);
    }

    RemoveItem(index) {
        let item = this.dropdownMenu.children[index];
        item.remove();
    }
}
Dropdown.createMenuItem = function (valueJson) {
    let image_url = Flask.url_for('static', { 'filename': 'profile_pics/' + valueJson.image_file });

    let item = document.createElement('div');
    item.className = 'invite-user-item';
    item.setAttribute('data-username', valueJson.username);
    item.setAttribute('data-image-url', valueJson.image_file);
    item.spellcheck = false;

    let text = document.createElement('p');
    text.innerHTML = valueJson.username;
    text.className = 'm0';

    let image = document.createElement('img');
    image.src = image_url;

    item.appendChild(image);
    item.appendChild(text);

    return item;
}

export { Dropdown }