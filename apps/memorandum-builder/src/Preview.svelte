<script>
  let { memo, logoUrl = "" } = $props();
  let lines = $derived(String(memo.body || "").split("\n"));
</script>

<div class="preview">
  {#if logoUrl}<img alt="" src={logoUrl} />{/if}
  <h3>{memo.formatting.title}</h3>
  <p><b>TO:</b> {memo.recipients}</p>
  <p><b>FROM:</b> {memo.issuingOfficial}</p>
  <p><b>CC:</b> {memo.cc || "—"}</p>
  <p><b>SUBJECT:</b> {memo.subject}</p>
  <p><b>DATE:</b> {memo.memoDate}</p>
  {#each lines as line, index (index)}
    <p>{line || "\u00a0"}</p>
  {/each}
</div>
