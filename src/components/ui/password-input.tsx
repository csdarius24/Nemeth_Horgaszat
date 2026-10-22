"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

/**
 * Jelszómező megjelenítés/elrejtés gombbal. Ugyanazokat a propokat fogadja,
 * mint az `Input` (a `type` kivételével, azt a gomb kapcsolja).
 */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [lathato, setLathato] = React.useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput type={lathato ? "text" : "password"} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={lathato ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
          aria-pressed={lathato}
          aria-controls={props.id}
          onClick={() => setLathato((l) => !l)}
          disabled={props.disabled}
        >
          {lathato ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
