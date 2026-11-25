import { mount } from "svelte";
import App from "../../apps/memorandum-builder/src/App.svelte";

const target = document.getElementById("app");
// mount() appends, so clear the static "Loading…" placeholder first.
target.textContent = "";
mount(App, { target });
