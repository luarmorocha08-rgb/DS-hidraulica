import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    // Efeitos que buscam dados (agenda) ou leem APIs só do navegador
    // (sessionStorage, geolocalização) atualizam estado de propósito.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Cena 3D: mutar objetos do Three.js dentro de useFrame é o padrão do React Three Fiber.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Decodificador Draco de terceiros (minificado)
    "public/**",
  ]),
]);

export default eslintConfig;
