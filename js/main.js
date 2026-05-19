const CART_KEY = "veloura_cart";

let activeToast = null;

/* =========================
   FORMAT PRICE
========================= */

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(price);
}

/* =========================
   STORAGE
========================= */

function getCart() {
  try {
    return JSON.parse(
      localStorage.getItem(CART_KEY)
    ) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(
    CART_KEY,
    JSON.stringify(cart)
  );
}

/* =========================
   TOAST
========================= */

function showToast(message) {

  if (activeToast) {
    activeToast.remove();
  }

  const toast =
    document.createElement("div");

  toast.className = "toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  activeToast = toast;

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {

    toast.classList.remove("show");

    setTimeout(() => {

      toast.remove();
      activeToast = null;

    }, 300);

  }, 2200);

}

/* =========================
   CART LOGIC
========================= */

function addToCart(product) {

  const cart = getCart();

  const existing =
    cart.find(
      item => item.id === product.id
    );

  if (existing) {

    existing.quantity += 1;

  } else {

    cart.push({
      ...product,
      quantity: 1
    });

  }

  saveCart(cart);

  showToast(
    `${product.name} added to cart`
  );

}

function removeItem(productId) {

  const updatedCart =
    getCart().filter(
      item => item.id !== productId
    );

  saveCart(updatedCart);

  renderCart();

}

function updateQuantity(
  productId,
  change
) {

  const cart = getCart();

  const item =
    cart.find(
      item => item.id === productId
    );

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {

    removeItem(productId);
    return;

  }

  saveCart(cart);

  renderCart();

}

function calculateTotal(cart) {

  return cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

}

/* =========================
   SUMMARY
========================= */

function updateSummary(cart) {

  const subtotalElement =
    document.querySelector(
      ".summary-subtotal"
    );

  const deliveryElement =
    document.querySelector(
      ".summary-delivery"
    );

  const totalElement =
    document.querySelector(
      ".summary-total"
    );

  if (
    !subtotalElement ||
    !deliveryElement ||
    !totalElement
  ) {
    return;
  }

  const subtotal =
    calculateTotal(cart);

  const delivery =
    subtotal > 0 ? 120 : 0;

  const total =
    subtotal + delivery;

  subtotalElement.textContent =
    formatPrice(subtotal);

  deliveryElement.textContent =
    formatPrice(delivery);

  totalElement.textContent =
    formatPrice(total);

}

/* =========================
   RENDER CART
========================= */

function renderCart() {

  const wrapper =
    document.querySelector(
      ".cart-items-wrapper"
    );

  const emptyCart =
    document.querySelector(
      ".empty-cart"
    );

  const cartSection =
    document.querySelector(
      ".cart-section"
    );

  if (
    !wrapper ||
    !emptyCart ||
    !cartSection
  ) {
    return;
  }

  const cart = getCart();

  wrapper.innerHTML = "";

  if (!cart.length) {

    cartSection.classList.add(
      "hidden"
    );

    emptyCart.classList.remove(
      "hidden"
    );

    updateSummary([]);

    return;

  }

  cartSection.classList.remove(
    "hidden"
  );

  emptyCart.classList.add(
    "hidden"
  );

  cart.forEach(item => {

    const article =
      document.createElement("article");

    article.className =
      "cart-item";

    article.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}">
      </div>

      <div class="cart-item-content">

        <div class="cart-item-top">

          <div>
            <h3>${item.name}</h3>

            <p class="cart-item-price">
              ${formatPrice(item.price)}
            </p>
          </div>

          <button
            class="remove-btn"
            data-remove="${item.id}"
          >
            Remove
          </button>

        </div>

        <div class="quantity-controls">

          <button
            class="qty-btn"
            data-decrease="${item.id}"
          >
            -
          </button>

          <span class="qty-value">
            ${item.quantity}
          </span>

          <button
            class="qty-btn"
            data-increase="${item.id}"
          >
            +
          </button>

        </div>

      </div>
    `;

    wrapper.appendChild(article);

  });

  updateSummary(cart);

  setupCartActions();

}

/* =========================
   CART ACTIONS
========================= */

function setupCartActions() {

  document
    .querySelectorAll("[data-remove]")
    .forEach(button => {

      button.onclick = () => {

        removeItem(
          button.dataset.remove
        );

      };

    });

  document
    .querySelectorAll("[data-increase]")
    .forEach(button => {

      button.onclick = () => {

        updateQuantity(
          button.dataset.increase,
          1
        );

      };

    });

  document
    .querySelectorAll("[data-decrease]")
    .forEach(button => {

      button.onclick = () => {

        updateQuantity(
          button.dataset.decrease,
          -1
        );

      };

    });

}

/* =========================
   FETCH MENU
========================= */

async function fetchMenu() {

  try {

    const response =
      await fetch("./data/menu.json");

    if (!response.ok) {
      throw new Error(
        "Menu fetch failed"
      );
    }

    return await response.json();

  } catch (error) {

    console.error(error);

    return [];

  }

}

/* =========================
   RENDER MENU
========================= */

async function renderMenu(
  filter = "All"
) {

  const grid =
    document.querySelector(
      ".menu-grid"
    );

  if (!grid) return;

  const menu =
    await fetchMenu();

  const items =
    filter === "All"
      ? menu
      : menu.filter(
          item =>
            item.category === filter
        );

  grid.innerHTML = "";

  items.forEach(item => {

    const card =
      document.createElement("article");

    card.className = "menu-card";

    card.innerHTML = `
      <div class="menu-image">
        <img
          src="${item.image}"
          alt="${item.name}"
          loading="lazy"
        >
      </div>

      <div class="menu-content">

        <div class="menu-top">

          <h3>${item.name}</h3>

          <span class="price">
            ${formatPrice(item.price)}
          </span>

        </div>

        <p class="menu-description">
          ${item.description}
        </p>

        <div class="menu-bottom">

          <span class="availability ${
            item.available
              ? "in-stock"
              : "low-stock"
          }">

            ${
              item.available
                ? "Available"
                : "Unavailable"
            }

          </span>

          <button
            class="add-cart-btn"
            data-id="${item.id}"
            data-name="${item.name}"
            data-price="${item.price}"
            data-image="${item.image}"
            ${!item.available ? "disabled" : ""}
          >
            Add to Cart
          </button>

        </div>

      </div>
    `;

    grid.appendChild(card);

  });

  setupMenuButtons();

}

/* =========================
   MENU BUTTONS
========================= */

function setupMenuButtons() {

  document
    .querySelectorAll(".add-cart-btn")
    .forEach(button => {

      button.onclick = () => {

        const product = {

          id:
            button.dataset.id,

          name:
            button.dataset.name,

          price: Number(
            button.dataset.price
          ),

          image:
            button.dataset.image

        };

        addToCart(product);

      };

    });

}

/* =========================
   CATEGORY FILTERS
========================= */

function setupCategoryFilters() {

  const buttons =
    document.querySelectorAll(
      ".category-btn"
    );

  buttons.forEach(button => {

    button.onclick = () => {

      buttons.forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      renderMenu(
        button.textContent.trim()
      );

    };

  });

}

/* =========================
   PINCODE CHECK
========================= */

function setupPincodeChecker() {

  const button =
    document.querySelector(
      ".check-pincode-btn"
    );

  if (!button) return;

  button.onclick = () => {

    const input =
      document.querySelector(
        ".pincode-input"
      );

    const message =
      document.querySelector(
        ".delivery-success"
      );

    if (!input || !message) return;

    const value =
      input.value.trim();

    if (!/^\d{6}$/.test(value)) {

      message.textContent =
        "Enter valid 6-digit pincode";

      message.style.color =
        "#b44f4f";

      return;

    }

    const allowed = [
      "440001",
      "440010",
      "440015",
      "440022"
    ];

    if (allowed.includes(value)) {

      message.textContent =
        "Delivery available in your area!";

      message.style.color =
        "#2f7a3f";

    } else {

      message.textContent =
        "Delivery unavailable";

      message.style.color =
        "#b44f4f";

    }

  };

}

/* =========================
   CHECKOUT
========================= */

function setupCheckoutForm() {

  const form =
    document.querySelector(
      ".checkout-form"
    );

  if (!form) return;

  form.onsubmit = async e => {

    e.preventDefault();

    const cart = getCart();

    if (!cart.length) {

      showToast(
        "Your cart is empty"
      );

      return;

    }

    /* =========================
       FORM FIELDS
    ========================= */

    const nameInput =
      form.querySelector(
        'input[type="text"]'
      );

    const phoneInput =
      form.querySelector(
        'input[type="tel"]'
      );

    const textareas =
      form.querySelectorAll(
        "textarea"
      );

    const addressInput =
      textareas[0];

    const instructions = 
      textareas[1].value.trim();

    const pincodeInput =
      document.querySelector(
        ".pincode-input"
      );

    const deliveryMessage =
      document.querySelector(
        ".delivery-success"
      );

    const name =
      nameInput.value.trim();

    const phone =
      phoneInput.value
        .replace(/\s+/g, "")
        .trim();

    const address =
      addressInput.value.trim();

    const pincode =
      pincodeInput.value.trim();

    /* =========================
       NAME VALIDATION
    ========================= */

    if (name.length < 2) {

      showToast(
        "Enter a valid name"
      );

      nameInput.focus();

      return;

    }

    /* =========================
       PHONE VALIDATION
    ========================= */

    const indianPhoneRegex =
      /^(?:\+91|91)?[6-9]\d{9}$/;

    if (
      !indianPhoneRegex.test(phone)
    ) {

      showToast(
        "Enter valid Indian mobile number"
      );

      phoneInput.focus();

      return;

    }

    /* =========================
       ADDRESS VALIDATION
    ========================= */

    if (address.length < 10) {

      showToast(
        "Enter complete address"
      );

      addressInput.focus();

      return;

    }

    /* =========================
       PINCODE VALIDATION
    ========================= */

    if (
      !/^\d{6}$/.test(pincode)
    ) {

      showToast(
        "Enter valid pincode"
      );

      pincodeInput.focus();

      return;

    }

    const allowedPincodes = [
      "440001",
      "440010",
      "440015",
      "440022"
    ];

    if (
      !allowedPincodes.includes(
        pincode
      )
    ) {

      showToast(
        "Delivery unavailable for this area"
      );

      return;

    }

    /* =========================
       BUTTON LOADING STATE
    ========================= */

    const button =
      document.querySelector(
        ".place-order-btn"
      );

    button.disabled = true;

    button.textContent =
      "Placing Order...";

    /* =========================
       ORDER PAYLOAD
    ========================= */

    const orderData = {

      customer: {
        name,
        phone,
        address,
        pincode,
        instructions
      },

      items: cart,

      subtotal:
        calculateTotal(cart),

      deliveryFee: 120,

      total:
        calculateTotal(cart) + 120

    };

    console.log(
      "ORDER PAYLOAD:",
      orderData
    );

/* =========================
   SEND ORDER TO BACKEND
========================= */
  
try {

  const response =
    await fetch(
      "/api/order",
      {
        method: "POST",
      
        headers: {
          "Content-Type":
            "application/json"
        },
      
        body: JSON.stringify(
          orderData
        )
      }
    );
  
  const data =
    await response.json();
  
  if (!response.ok) {
  
    throw new Error(
      data.message ||
      "Order failed"
    );
  
  }

  /* =========================
     SUCCESS
  ========================= */

  localStorage.removeItem(
    CART_KEY
  );

  renderCart();

  form.reset();

  if (deliveryMessage) {
    deliveryMessage.textContent = "";
  }

  showToast(
    "Order placed successfully"
  );

} catch (error) {

  console.error(error);

  showToast(
    error.message ||
    "Something went wrong"
  );

} finally {

  button.disabled = false;

  button.textContent =
    "Place Order";

}
  };

}

/* =========================
   BUSINESS SATUS
========================= */

function setupBusinessStatus() {

  const statusElement =
    document.querySelector(
      ".open-status"
    );

  if (!statusElement) return;

  const now = new Date();

  const currentHour =
    now.getHours();

  const currentDay =
    now.getDay();

  /*
    DAYS:
    0 = Sunday
    6 = Saturday
  */

  const isWeekend =
    currentDay === 0;

  const openingHour = 10;
  const closingHour = 21;

  /* =========================
     WEEKEND CLOSED
  ========================= */

  if (isWeekend) {

    statusElement.textContent =
      "Closed Today";

    statusElement.style.color =
      "#b44f4f";

    return;

  }

  /* =========================
     OPEN HOURS
  ========================= */

  if (
    currentHour >= openingHour &&
    currentHour < closingHour
  ) {

    statusElement.textContent =
      "Open Now";

    statusElement.style.color =
      "#2f7a3f";

  } else {

    statusElement.textContent =
      "Pre-orders Available";

    statusElement.style.color =
      "#c28b2c";

  }

}


/* =========================
   INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupBusinessStatus();

    renderMenu();

    renderCart();

    setupMenuButtons();

    setupCategoryFilters();

    setupPincodeChecker();

    setupCheckoutForm();

  }
);