const form = document.querySelector(".custom-cake-form");
const cakeImageInput = document.querySelector("#cakeImage");
const previewWrapper = document.querySelector("#previewWrapper");
const previewImage = document.querySelector("#previewImage");
const fileStatusLabel = document.querySelector("#file-status-label");

/* =========================
   LIVE IMAGE PREVIEW
========================= */
cakeImageInput.onchange = () => {
  const [file] = cakeImageInput.files;
  if (file) {
    previewImage.src = URL.createObjectURL(file);
    previewWrapper.classList.remove("hidden");
    fileStatusLabel.textContent = "Change Selected Image";
  } else {
    previewWrapper.classList.add("hidden");
    fileStatusLabel.textContent = "Choose or Drop an image";
  }
};

/* =========================
   FORM SUBMISSION FLOW
========================= */
form.onsubmit = async event => {
  event.preventDefault();

  const submitButton = form.querySelector(".submit-custom-btn");
  submitButton.disabled = true;
  submitButton.textContent = "Uploading Request...";

  try {
    const formData = new FormData(form);

    const response = await fetch("/api/custom-cake-api", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    alert("Your custom cake request has been submitted successfully!");
    form.reset();
    previewWrapper.classList.add("hidden");
    previewImage.src = "";
    fileStatusLabel.textContent = "Choose or Drop an image";

  } catch (error) {
    alert(error.message || "Something went wrong processing your request.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Custom Cake Request";
  }
};