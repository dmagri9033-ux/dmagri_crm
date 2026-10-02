"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  deleteProductAction,
  setProductActiveAction,
  type ProductActionState,
} from "@/actions/products";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db/products";

function ActionButton({
  label,
  variant = "outline",
}: {
  label: string;
  variant?: "outline" | "destructive" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function ProductRowActions({ product }: { product: Product }) {
  const router = useRouter();
  const [toggleState, toggleAction] = useActionState<ProductActionState, FormData>(
    setProductActiveAction,
    {},
  );
  const [deleteState, deleteAction] = useActionState<ProductActionState, FormData>(
    deleteProductAction,
    {},
  );

  useEffect(() => {
    if (toggleState.success || deleteState.success) {
      router.refresh();
    }
  }, [toggleState.success, deleteState.success, router]);

  const error = toggleState.error || deleteState.error;

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <Alert variant="destructive" className="max-w-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Can permission="product.update">
          <form action={toggleAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="hidden"
              name="is_active"
              value={product.is_active ? "false" : "true"}
            />
            <ActionButton
              label={product.is_active ? "Deactivate" : "Activate"}
              variant="secondary"
            />
          </form>
        </Can>

        <Can permission="product.delete">
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete "${product.name}"? This only works if it is not referenced by customers or inquiries.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="productId" value={product.id} />
            <ActionButton label="Delete" variant="destructive" />
          </form>
        </Can>
      </div>
    </div>
  );
}
