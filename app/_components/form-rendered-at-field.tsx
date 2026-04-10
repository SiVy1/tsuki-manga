"use client";

export function FormRenderedAtField() {
  return (
    <input
      type="hidden"
      name="renderedAt"
      defaultValue=""
      ref={(node) => {
        if (node && !node.value) {
          node.value = String(Date.now());
        }
      }}
    />
  );
}
