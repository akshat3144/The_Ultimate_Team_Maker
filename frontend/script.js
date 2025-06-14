document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const fileInput = document.getElementById("csv-file");
  const fileName = document.getElementById("file-name");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");
  const teamGenSection = document.getElementById("team-generation");
  const categoriesSection = document.getElementById("categories-section");
  const categoriesContainer = document.getElementById("categories-container");
  const weightSumWarning = document.getElementById("weight-sum-warning");
  const generateBtn = document.getElementById("generate-btn");
  const resultsSection = document.getElementById("results");
  const teamsContainer = document.getElementById("teams-container");
  const downloadBtn = document.getElementById("download-btn");
  const newGenerationBtn = document.getElementById("new-generation-btn");
  const genMethodRadios = document.querySelectorAll('input[name="gen-method"]');
  const numTeamsInput = document.getElementById("num-teams");
  const teamCountElement = document.getElementById("team-count");
  const memberCountElement = document.getElementById("member-count");
  const membersPerTeamElement = document.getElementById("members-per-team");

  // Toast container for notifications
  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);

  // State variables
  let uploadedFilePath = "";
  let headers = [];
  let categories = [];
  let selectedCategories = [];
  let generatedTeams = [];
  let dragCounter = 0;
  let selectedMethod = "random"; // Add this line to define the variable globally with default value

  // Event Listeners
  fileInput.addEventListener("change", handleFileSelect);
  uploadBtn.addEventListener("click", uploadCSV);
  generateBtn.addEventListener("click", generateTeams);
  downloadBtn.addEventListener("click", downloadTeams);
  newGenerationBtn.addEventListener("click", showTeamGeneration);

  genMethodRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      selectedMethod = e.target.value; // Update the global variable when method changes
      toggleCategoriesSection();
    });
  });

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Setup drag and drop for file upload
  const uploadLabel = document.querySelector(".upload-label");

  uploadLabel.addEventListener("dragenter", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    this.classList.add("dragover");
  });

  uploadLabel.addEventListener("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      this.classList.remove("dragover");
    }
  });

  uploadLabel.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  uploadLabel.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    this.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect({ target: fileInput });
    }
  });

  // Initialize
  function init() {
    toggleCategoriesSection();
  }

  // Show toast notification
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-circle";

    toast.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Force reflow
    toast.offsetWidth;

    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toastContainer.removeChild(toast), 300);
    }, 3000);
  }

  // Handle file selection
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      fileName.textContent = file.name;
      uploadBtn.disabled = false;

      // If file is not CSV
      if (!file.name.toLowerCase().endsWith(".csv")) {
        showToast("Please select a CSV file.", "error");
        fileName.textContent = "Invalid file type";
        uploadBtn.disabled = true;
        return;
      }

      // Animate the file name
      fileName.classList.add("fadeIn");
      setTimeout(() => fileName.classList.remove("fadeIn"), 500);
    } else {
      fileName.textContent = "No file selected";
      uploadBtn.disabled = true;
    }
  }

  // Upload CSV file
  async function uploadCSV() {
    // Clear previous status
    uploadStatus.innerHTML = "";
    uploadStatus.className = "";

    // Add loading spinner
    uploadStatus.innerHTML =
      '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Uploading...';

    const file = fileInput.files[0];
    if (!file) {
      showToast("Please select a file first.", "error");
      uploadStatus.innerHTML = "";
      return;
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please select a valid CSV file.", "error");
      uploadStatus.innerHTML =
        '<i class="fas fa-exclamation-circle me-2"></i> Invalid file type';
      uploadStatus.className = "status-indicator status-error";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/upload-csv/", {
        method: "POST",
        body: formData,
      });

      // First try to parse the response as JSON
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        console.log("Raw response:", text);

        // More user-friendly error message
        uploadStatus.innerHTML =
          '<i class="fas fa-exclamation-circle me-2"></i> Server returned invalid format';
        uploadStatus.className = "status-indicator status-error";
        showToast(
          "The server response couldn't be processed. Please try a different CSV file.",
          "error"
        );
        return;
      }

      if (response.ok) {
        uploadStatus.innerHTML =
          '<i class="fas fa-check-circle me-2"></i> File uploaded successfully!';
        uploadStatus.className = "status-indicator status-success";
        uploadedFilePath = data.file_path;
        headers = data.headers;
        populateCategories();

        // Show team generation section with animation
        teamGenSection.style.display = "block";
        teamGenSection.classList.add("fadeIn");

        // Smooth scroll to team generation section
        teamGenSection.scrollIntoView({ behavior: "smooth" });

        showToast("CSV file uploaded successfully!", "success");
      } else {
        let errorMessage = data.error || "Upload failed";
        uploadStatus.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i> ${errorMessage}`;
        uploadStatus.className = "status-indicator status-error";

        // Provide more context in the toast message
        if (errorMessage.includes("Invalid CSV")) {
          showToast(
            "Your CSV file appears to be invalid. Please check the format.",
            "error"
          );
        } else {
          showToast(errorMessage, "error");
        }

        // Log additional error details if available
        if (data.raw_output) {
          console.log("Raw output from server:", data.raw_output);
        }
      }
    } catch (error) {
      uploadStatus.innerHTML =
        '<i class="fas fa-exclamation-circle me-2"></i> Upload error';
      uploadStatus.className = "status-indicator status-error";
      showToast(
        "Network error during upload. Please check your connection and try again.",
        "error"
      );
      console.error("Error:", error);
    }
  }

  // Populate categories based on CSV headers
  function populateCategories() {
    categoriesContainer.innerHTML = "";
    categories = [];

    // Skip first header (name)
    for (let i = 1; i < headers.length; i++) {
      const categoryName = headers[i];
      categories.push({
        index: i - 1,
        name: categoryName,
        selected: false,
        weight: 0,
      });
    }

    // Create UI for each category
    categories.forEach((category) => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "category-item";

      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "form-check";

      const checkbox = document.createElement("input");
      checkbox.className = "form-check-input";
      checkbox.type = "checkbox";
      checkbox.id = `category-${category.index}`;
      checkbox.dataset.index = category.index;

      const label = document.createElement("label");
      label.className = "form-check-label";
      label.htmlFor = `category-${category.index}`;
      label.textContent = category.name;

      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);

      const weightContainer = document.createElement("div");
      weightContainer.className = "category-weight-container";

      const weightLabel = document.createElement("span");
      weightLabel.textContent = "Weight:";
      weightLabel.className = "me-2";

      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.className = "form-control form-control-sm";
      weightInput.min = 0;
      weightInput.max = 1;
      weightInput.step = 0.1;
      weightInput.value = 0;
      weightInput.dataset.index = category.index;
      weightInput.disabled = true;
      weightInput.style.width = "80px";

      weightContainer.appendChild(weightLabel);
      weightContainer.appendChild(weightInput);

      categoryItem.appendChild(checkboxDiv);
      categoryItem.appendChild(weightContainer);

      checkbox.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        categories[index].selected = e.target.checked;
        weightInput.disabled = !e.target.checked;

        // Animate background color change
        if (e.target.checked) {
          categoryItem.style.backgroundColor = "#eef2ff";
        } else {
          categoryItem.style.backgroundColor = "#f8f9fa";
          weightInput.value = 0;
          categories[index].weight = 0;
        }

        updateSelectedCategories();
      });

      weightInput.addEventListener("input", (e) => {
        const index = parseInt(e.target.dataset.index);
        categories[index].weight = parseFloat(e.target.value) || 0;
        checkWeightSum();
      });

      categoriesContainer.appendChild(categoryItem);
    });
  }

  // Check if weights sum to 1.0
  function checkWeightSum() {
    const sum = selectedCategories.reduce((acc, cat) => acc + cat.weight, 0);
    const isValid = Math.abs(sum - 1.0) < 0.001; // Allow small rounding errors

    if (selectedCategories.length > 0) {
      weightSumWarning.classList.toggle("d-none", isValid);
    } else {
      weightSumWarning.classList.add("d-none");
    }

    generateBtn.disabled = !isValid && selectedCategories.length > 0;

    // Update UI to show current sum
    if (selectedCategories.length > 0) {
      weightSumWarning.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        Weights must sum to 1.0 (Current: ${sum.toFixed(2)})
      `;
    }

    return isValid;
  }

  // Update selected categories
  function updateSelectedCategories() {
    selectedCategories = categories.filter((cat) => cat.selected);
    checkWeightSum();
  }

  // Toggle categories section based on generation method
  function toggleCategoriesSection() {
    // Update the following line to use the global variable
    if (selectedMethod === "random") {
      categoriesSection.style.display = "none";
      // Enable generate button for random method
      generateBtn.disabled = false;
    } else {
      categoriesSection.style.display = "block";
      // Update button state based on category selection
      updateSelectedCategories();
    }

    // Highlight selected method card
    document.querySelectorAll(".method-card").forEach((card) => {
      const radio = card.previousElementSibling;
      if (radio.checked) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
  }

  // Generate teams - modify to use global selectedMethod
  async function generateTeams() {
    // Remove this line as we're now using the global variable
    // const selectedMethod = document.querySelector('input[name="gen-method"]:checked').value;
    const numTeams = parseInt(numTeamsInput.value);

    if (numTeams < 2) {
      showToast("Please enter at least 2 teams.", "error");
      return;
    }

    if (selectedMethod !== "random" && selectedCategories.length === 0) {
      showToast("Please select at least one category.", "error");
      return;
    }

    if (selectedMethod !== "random" && !checkWeightSum()) {
      showToast("Category weights must sum to 1.0.", "error");
      return;
    }

    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...';

    const request = {
      num_teams: numTeams,
      generation_type: selectedMethod,
      file_path: uploadedFilePath,
    };

    if (selectedMethod !== "random") {
      request.categories = selectedCategories.map((cat) => ({
        index: cat.index,
        weight: cat.weight,
        name: cat.name,
      }));
    }

    try {
      const response = await fetch("/generate-teams/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (response.ok) {
        generatedTeams = data.teams;
        displayTeams();
        teamGenSection.style.display = "none";
        resultsSection.style.display = "block";
        resultsSection.classList.add("fadeIn");

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: "smooth" });

        showToast(`${numTeams} teams successfully generated!`, "success");
      } else {
        showToast(data.error || "Failed to generate teams.", "error");
      }
    } catch (error) {
      showToast("An error occurred while generating teams.", "error");
      console.error("Error:", error);
    } finally {
      // Reset button state
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-users me-2"></i>Generate Teams';
    }
  }

  // Display generated teams - modified to show a range of members per team
  function displayTeams() {
    teamsContainer.innerHTML = "";

    // Update statistics
    let totalMembers = 0;
    generatedTeams.forEach((team) => {
      totalMembers += team.members.length;
    });

    teamCountElement.textContent = generatedTeams.length;
    memberCountElement.textContent = totalMembers;

    // Calculate floor and ceiling values for members per team
    const floorPerTeam = Math.floor(totalMembers / generatedTeams.length);
    const ceilPerTeam = Math.ceil(totalMembers / generatedTeams.length);

    // Display as a range if floor and ceiling are different
    membersPerTeamElement.textContent =
      floorPerTeam === ceilPerTeam
        ? floorPerTeam
        : `${floorPerTeam} - ${ceilPerTeam}`;

    // Display each team with animation
    generatedTeams.forEach((team, index) => {
      const teamCard = document.createElement("div");
      teamCard.className = "team-card";
      teamCard.style.animationDelay = `${index * 0.1}s`;

      // Create team header
      const teamHeader = document.createElement("div");
      teamHeader.className = "team-card-header";

      // Randomly select a color for each team
      const colors = [
        "#4361ee",
        "#3a0ca3",
        "#7209b7",
        "#f72585",
        "#4cc9f0",
        "#4895ef",
      ];
      teamHeader.style.backgroundColor = colors[index % colors.length];

      const teamName = document.createElement("h3");
      teamName.textContent = `Team ${team.team_number}`;

      const teamMemberCount = document.createElement("span");
      teamMemberCount.className = "badge bg-light text-dark";
      teamMemberCount.textContent = `${team.members.length} members`;

      teamHeader.appendChild(teamName);
      teamHeader.appendChild(teamMemberCount);

      // Create team body
      const teamBody = document.createElement("div");
      teamBody.className = "team-card-body";

      const membersList = document.createElement("ul");
      membersList.className = "team-members-list";

      team.members.forEach((member) => {
        const memberItem = document.createElement("li");
        memberItem.className = "team-member-item";

        // Create avatar with initials
        const avatar = document.createElement("div");
        avatar.className = "member-avatar";
        const initials = member
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();
        avatar.textContent = initials;

        const memberName = document.createElement("span");
        memberName.textContent = member;

        memberItem.appendChild(avatar);
        memberItem.appendChild(memberName);
        membersList.appendChild(memberItem);
      });

      teamBody.appendChild(membersList);
      teamCard.appendChild(teamHeader);
      teamCard.appendChild(teamBody);
      teamsContainer.appendChild(teamCard);

      // Trigger animation
      teamCard.classList.add("fadeIn");
    });
  }

  // Download teams as CSV
  function downloadTeams() {
    let csvContent = "Team Number,Member Name\n";

    generatedTeams.forEach((team) => {
      team.members.forEach((member) => {
        csvContent += `${team.team_number},${member}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `team-maker-teams-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Teams downloaded successfully!", "success");
  }

  // Show team generation section
  function showTeamGeneration() {
    resultsSection.style.display = "none";
    teamGenSection.style.display = "block";
    teamGenSection.classList.add("fadeIn");

    // Reset generation method selection
    toggleCategoriesSection();

    // Scroll to team generation section
    teamGenSection.scrollIntoView({ behavior: "smooth" });
  }

  // Add new DOM elements for search functionality
  const searchCategoryBtn = document.getElementById("search-category-btn");
  const searchCategoryModal = new bootstrap.Modal(
    document.getElementById("searchCategoryModal")
  );
  const categorySelectDropdown = document.getElementById("category-select");
  const searchResultsContainer = document.getElementById(
    "search-results-container"
  );
  const downloadSearchResultsBtn = document.getElementById(
    "download-search-results-btn"
  );

  // Add new event listeners
  if (searchCategoryBtn) {
    searchCategoryBtn.addEventListener("click", openSearchModal);
  }

  if (document.getElementById("perform-search-btn")) {
    document
      .getElementById("perform-search-btn")
      .addEventListener("click", searchTeamsByCategory);
  }

  if (downloadSearchResultsBtn) {
    downloadSearchResultsBtn.addEventListener("click", downloadSearchResults);
  }

  // State for search results
  let searchResults = null;

  // Open search modal and populate category dropdown
  function openSearchModal() {
    // Only show categories that were used in team generation
    if (selectedMethod !== "random" && selectedCategories.length > 0) {
      categorySelectDropdown.innerHTML = "";

      selectedCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.index;
        option.textContent = category.name;
        categorySelectDropdown.appendChild(option);
      });

      searchCategoryModal.show();
    } else if (selectedMethod === "random") {
      showToast(
        "Search by category is not available for random teams.",
        "error"
      );
    } else {
      showToast("Please select at least one category first.", "error");
    }
  }

  // Search teams by category
  async function searchTeamsByCategory() {
    const categoryIndex = parseInt(categorySelectDropdown.value);

    if (isNaN(categoryIndex)) {
      showToast("Please select a category to search by.", "error");
      return;
    }

    // Show loading state
    const searchBtn = document.getElementById("perform-search-btn");
    searchBtn.disabled = true;
    searchBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Searching...';

    const request = {
      file_path: uploadedFilePath,
      generation_type: selectedMethod,
      num_teams: parseInt(numTeamsInput.value),
      category_index: categoryIndex,
      categories: selectedCategories.map((cat) => ({
        index: cat.index,
        weight: cat.weight,
        name: cat.name,
      })),
    };

    try {
      const response = await fetch("/search-teams-by-category/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (response.ok) {
        searchResults = data;
        displaySearchResults();

        // Enable download button
        downloadSearchResultsBtn.disabled = false;

        showToast("Teams searched successfully!", "success");
      } else {
        showToast(data.error || "Failed to search teams by category.", "error");
      }
    } catch (error) {
      showToast("An error occurred while searching teams.", "error");
      console.error("Error:", error);
    } finally {
      // Reset button state
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search';
    }
  }

  // Display search results
  function displaySearchResults() {
    if (!searchResults || !searchResults.results) {
      searchResultsContainer.innerHTML =
        '<div class="alert alert-info">No results found.</div>';
      return;
    }

    searchResultsContainer.innerHTML = `
      <h5 class="mb-3">Teams Ranked by ${searchResults.category_name}</h5>
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-primary">
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Total Score</th>
              <th>Members</th>
            </tr>
          </thead>
          <tbody>
            ${searchResults.results
              .map(
                (result) => `
              <tr>
                <td class="text-center">
                  ${getRankBadge(result.rank)}
                </td>
                <td>Team ${result.team_number}</td>
                <td>${result.score.toFixed(2)}</td>
                <td>
                  <ul class="list-group">
                    ${result.members
                      .map(
                        (member) => `
                      <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${member.name}
                        <span class="badge bg-primary rounded-pill">${member.individual_score.toFixed(
                          1
                        )}</span>
                      </li>
                    `
                      )
                      .join("")}
                  </ul>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Helper function to get rank badge with appropriate color
  function getRankBadge(rank) {
    let badgeClass = "bg-secondary";
    if (rank === 1) badgeClass = "bg-warning text-dark"; // Gold
    else if (rank === 2) badgeClass = "bg-light text-dark border"; // Silver
    else if (rank === 3) badgeClass = "bg-danger"; // Bronze

    return `<span class="badge ${badgeClass}">${rank}</span>`;
  }

  // Download search results as CSV
  function downloadSearchResults() {
    if (!searchResults || !searchResults.results) {
      showToast("No search results to download.", "error");
      return;
    }

    let csvContent = `Rank,Team,Total ${searchResults.category_name} Score,Member Name,Individual Score\n`;

    searchResults.results.forEach((result) => {
      result.members.forEach((member) => {
        csvContent += `${result.rank},Team ${
          result.team_number
        },${result.score.toFixed(2)},${
          member.name
        },${member.individual_score.toFixed(1)}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `team-search-by-${searchResults.category_name.toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Search results downloaded successfully!", "success");
  }

  // Initialize app
  init();
});
