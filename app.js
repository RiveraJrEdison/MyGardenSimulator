// =====================================================================
        // SEMANTIC VERSIONING (SemVer 2.0.0)
        // Single source of truth. Do not hard-code the version elsewhere.
        // MAJOR: breaking change (e.g. changing bridge function names/signatures that Python depends on)
        // MINOR: new backward-compatible feature (e.g. finishing a new topic's code)
        // PATCH: bug fix or small tweak with no new feature
        // Use 0.x.y while in development; move to 1.0.0 once all 11 topics are complete.
        // =====================================================================
        const APP_VERSION = "0.2.0";

        let pyodideInstance = null;
        let gardenPlants = {};
        // Display-only list of action labels (populated by Python via pushAction). No JS game logic.
        let displayActionHistory = [];

        // =====================================================================
        // TOPIC TEMPLATES — paste your Python for each topic into the matching entry.
        // Call the bridge functions from your Python to update the UI.
        // =====================================================================
        const topicTemplates = {
            1: {
                title: "Python OOP + Big O + Stacks",
                code: `# Topic 1: Python OOP + Big O + Stacks
# ==== WRITE YOUR CODE HERE ====
`
            },
            2: {
                title: "Queues & Deques (FIFO Elements)",
                code: `# Topic 2: Queues & Deques (FIFO Elements)
# ==== WRITE YOUR CODE HERE ====
`
            },
            3: {
                title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures",
                code: `# Topic 3: Static/Dynamic Arrays, 2D Lists, & Memory Structures
# ==== WRITE YOUR CODE HERE ====
`
            },
            4: {
                title: "Hierarchical Trees & Traversals",
                code: `# Topic 4: Hierarchical Trees & Traversals
# ==== WRITE YOUR CODE HERE ====
`
            },
            5: {
                title: "Binary Search Trees (BST) & Node Mutation",
                code: `# Topic 5: Binary Search Trees (BST) & Node Mutation
# ==== WRITE YOUR CODE HERE ====
`
            },
            6: {
                title: "Hash Tables, Collisions, & Rehashing",
                code: `# Topic 6: Hash Tables, Collisions, & Rehashing
# ==== WRITE YOUR CODE HERE ====
`
            },
            7: {
                title: "Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS",
                code: `# Topic 7: Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS
# ==== WRITE YOUR CODE HERE ====
`
            },
            8: {
                title: "Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)",
                code: `# Topic 8: Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)
# ==== WRITE YOUR CODE HERE ====
`
            },
            9: {
                title: "Searching Algorithms (Linear Search vs. Binary Search)",
                code: `# Topic 9: Searching Algorithms (Linear Search vs. Binary Search)
# ==== WRITE YOUR CODE HERE ====
`
            },
            10: {
                title: "Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)",
                code: `# Topic 10: Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)
# ==== WRITE YOUR CODE HERE ====
`
            },
            11: {
                title: "Dynamic Programming (DP), Memoization, & Divide-and-Conquer",
                code: `# Topic 11: Dynamic Programming (DP), Memoization, & Divide-and-Conquer
# ==== WRITE YOUR CODE HERE ====
`
            },
            12: {
                title: "Resource Storage and Seed Bank",
                code: `# Topic 12: Additional Module
# ==== WRITE YOUR CODE HERE ====
`
            }
        };

        async function initPyodide() {
            if (pyodideInstance) return;
            const consoleEl = document.getElementById("output-console");
            if (consoleEl) {
                consoleEl.innerHTML = `<span class="text-amber-400">Loading Python...</span><br>`;
            }
            try {
                pyodideInstance = await loadPyodide();
                // Bridge functions Python may call (pure display — no game rules)
                pyodideInstance.globals.set("addPlantToGrid", addPlantToGrid);
                pyodideInstance.globals.set("updateResources", updateResources);
                pyodideInstance.globals.set("addPlantsToDropdown", addPlantsToDropdown);
                pyodideInstance.globals.set("pushAction", pushAction);
                pyodideInstance.globals.set("popAction", popAction);
                pyodideInstance.globals.set("notify", notify);
                pyodideInstance.globals.set("updateClimateQueue", updateClimateQueue);
                await pyodideInstance.runPythonAsync(`
                    import sys
                    from js import document
                    class Console:
                        def write(self, text):
                            if text and text.strip():
                                el = document.getElementById("output-console")
                                if el:
                                    el.innerHTML += text.replace("\\n", "<br>")
                        def flush(self): pass
                    sys.stdout = Console()
                `);
                if (consoleEl) {
                    consoleEl.innerHTML = `<span class="text-emerald-400">Python ready.</span><br>`;
                }
            } catch (err) {
                if (consoleEl) {
                    consoleEl.innerHTML = `<span class="text-red-400">Failed to load Python: ${err.message}</span>`;
                }
                throw err;
            }
        }

        // ---- Pure display bridges (called from Python) ----

        // updateClimateQueue(events: list of strings)
        // Renders the FIFO climate events. Pass an empty list to clear.
        function updateClimateQueue(events) {
            const container = document.getElementById("climate-queue");
            container.innerHTML = "";
            if (!events || !events.length) return;
            events.forEach(event => {
                const div = document.createElement("div");
                div.className = "p-3 bg-amber-950/40 border border-amber-900 rounded-xl text-xs";
                div.innerHTML = `
                    <div class="font-bold text-amber-400">${event}</div>
                    <div class="text-emerald-300/80"> </div>
                `;
                container.appendChild(div);
            });
        }

        // addPlantToGrid(pos: int 0-24, name: str)
        // Marks a grid cell as planted (display only).
        function addPlantToGrid(pos, name) {
            gardenPlants[pos] = name;
            renderGarden();
        }

        function renderGarden() {
            const grid = document.getElementById("garden-grid");

            if (!grid) return;

            grid.innerHTML = "";

            for (let i = 0; i < 25; i++) {

                const cell = document.createElement("div");

                cell.className =
                    "aspect-square bg-[#2a3825] rounded-xl flex items-center justify-center text-3xl border border-emerald-800 cursor-pointer select-none";

                // Display plant or empty soil
                cell.textContent = gardenPlants[i] ? "🌱" : "⬜";

                // Make the tile clickable
                cell.onclick = () => plantFromUI(i);

                // Optional accessibility
                cell.title = gardenPlants[i]
                    ? `Occupied by ${gardenPlants[i]}`
                    : `Plant at plot ${i + 1}`;

                grid.appendChild(cell);
            }
        }

        async function plantFromUI(position) {

            if (!pyodideInstance) {
                showToast("Python is still loading.");
                return;
            }

            try {

                await pyodideInstance.runPythonAsync(
                    `plant_from_ui(${position})`
                );

            } catch (err) {

                console.error(err);

                const consoleEl =
                    document.getElementById("output-console");

                consoleEl.innerHTML +=
                    `<span class="text-red-400">
                    Planting error: ${err.message}
                    </span><br>`;
            }
        }

        // updateResources(water, seeds, energy, hope, coins)
        // Or pass a single object: updateResources({"water": n, "seeds": n, ...})
        // No fallbacks that turn a valid 0 into a default. Caps used only for bar width.
        function updateResources(water, seeds, energy, hope, coins) {
            if (typeof water === "object" && water !== null) {
                const args = water;
                water = args.water !== undefined ? args.water : 0;
                seeds = args.seeds !== undefined ? args.seeds : 0;
                energy = args.energy !== undefined ? args.energy : 0;
                hope = args.hope !== undefined ? args.hope : 0;
                coins = args.coins !== undefined ? args.coins : 0;
            } else {
                water = water !== undefined ? water : 0;
                seeds = seeds !== undefined ? seeds : 0;
                energy = energy !== undefined ? energy : 0;
                hope = hope !== undefined ? hope : 0;
                coins = coins !== undefined ? coins : 0;
            }
            const waterMax = 200, seedsMax = 100, energyMax = 120, hopeMax = 100;
            document.getElementById("water-text").innerText = `${water} / ${waterMax} L`;
            document.getElementById("water-bar").style.width = `${Math.min(100, (water / waterMax) * 100)}%`;
            document.getElementById("seeds-text").innerText = `${seeds} / ${seedsMax}`;
            document.getElementById("seeds-bar").style.width = `${Math.min(100, (seeds / seedsMax) * 100)}%`;
            document.getElementById("energy-text").innerText = `${energy} / ${energyMax} Wh`;
            document.getElementById("energy-bar").style.width = `${Math.min(100, (energy / energyMax) * 100)}%`;
            document.getElementById("hope-text").innerText = `${hope} / ${hopeMax}`;
            document.getElementById("hope-bar").style.width = `${Math.min(100, (hope / hopeMax) * 100)}%`;
            document.getElementById("coins-text").innerText = `${coins} Coins`;
        }

        // addPlantsToDropdown(plants: list of [name, emoji, cost])
        function addPlantsToDropdown(plants) {
            const select = document.getElementById("crop-selector");
            select.innerHTML = "";
            if (!plants) return;
            plants.forEach(([name, emoji, cost]) => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = `${emoji} ${name} (${cost}c)`;
                select.appendChild(option);
            });
        }

        // pushAction(action: str)
        // Appends a display label to the Action History panel (no JS undo logic).
        function pushAction(action) {
            displayActionHistory.push(action);
            if (displayActionHistory.length > 8) displayActionHistory.shift();
            renderActionStack();
        }

        function renderActionStack() {
            const container = document.getElementById("action-stack");
            container.innerHTML = "";
            [...displayActionHistory].reverse().forEach(act => {
                const div = document.createElement("div");
                div.className = "bg-emerald-950/60 border-l-2 border-amber-500 px-3 py-2 rounded text-xs text-emerald-100";
                div.textContent = `→ ${act}`;
                container.appendChild(div);
            });
        }

        // popAction(): removes the top displayed entry without adding a new one.
        // Called by Python's undo_last_action() after it actually reverses game state —
        // this is what makes the Undo button a real undo instead of a display-only pop.
        function popAction() {
            if (displayActionHistory.length > 0) {
                displayActionHistory.pop();
                renderActionStack();
            }
        }

        // notify(msg): lets Python trigger a toast without owning any DOM logic itself.
        function notify(msg) {
            showToast(msg);
        }

        // Undo button handler. Delegates to Python — action_stack (and what it takes
        // to reverse an action) lives entirely on the Python side.
        async function triggerUndo() {
            if (!pyodideInstance) {
                showToast("Python is still loading.");
                return;
            }
            try {
                await pyodideInstance.runPythonAsync("undo_last_action()");
            } catch (err) {
                console.error(err);
                const consoleEl = document.getElementById("output-console");
                if (consoleEl) {
                    consoleEl.innerHTML += `<span class="text-red-400">Undo error: ${err.message}</span><br>`;
                }
            }
        }

        function showToast(msg) {
            const toast = document.createElement("div");
            toast.className = "fixed bottom-6 right-6 bg-emerald-900 border border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 text-sm";
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }

        async function runPythonCode() {
            const consoleEl = document.getElementById("output-console");
            consoleEl.innerHTML = `<span class="text-amber-400">Running...</span><br>`;
            try {
                await initPyodide();
                const code = document.getElementById("code-editor").value.trim();
                await pyodideInstance.runPythonAsync(code);
            } catch (err) {
                consoleEl.innerHTML += `<span class="text-red-400">Error: ${err.message}</span>`;
            }
        }

        function loadTopic() {
            const key = document.getElementById("topic-selector").value;
            const editor = document.getElementById("code-editor");

            const savedCode = localStorage.getItem(`garden-topic-${key}`);

            if (savedCode !== null) {
                editor.value = savedCode;
            } else {
                editor.value = topicTemplates[key].code;
            }
        }

        function switchTab(tab) {
            document.getElementById("view-game").classList.toggle("hidden", tab !== "game");
            document.getElementById("view-code").classList.toggle("hidden", tab !== "code");
            document.getElementById("tab-game").classList.toggle("bg-[#283623]", tab === "game");
            document.getElementById("tab-game").classList.toggle("text-emerald-100", tab === "game");
            document.getElementById("tab-code").classList.toggle("bg-[#283623]", tab === "code");
            document.getElementById("tab-code").classList.toggle("text-emerald-100", tab === "code");
        }

        function saveCurrentCode() {
            const key = document.getElementById("topic-selector").value;
            const editor = document.getElementById("code-editor");

            localStorage.setItem(`garden-topic-${key}`, editor.value);
        }

       window.onload = () => {
            document.getElementById("version-badge").textContent = "v" + APP_VERSION;
            lucide.createIcons();
            renderGarden();
            renderActionStack();

            updateResources(0, 0, 0, 0, 0);

            const select = document.getElementById("topic-selector");

            Object.keys(topicTemplates).forEach(k => {
                const opt = document.createElement("option");
                opt.value = k;
                opt.textContent = topicTemplates[k].title;
                select.appendChild(opt);
            });

            const editor = document.getElementById("code-editor");

            editor.addEventListener("input", saveCurrentCode);

            loadTopic();
            switchTab("game");

            initPyodide().catch(() => {});
        };