<script>
  import TextField from "../../../dist/svelte/TextField.svelte";
  import { namedField } from "./shared";
  const count = () => {
    window.adapterEvents = (window.adapterEvents || 0) + 1;
  };
</script>

<TextField {...namedField} ontrailing={count} />
