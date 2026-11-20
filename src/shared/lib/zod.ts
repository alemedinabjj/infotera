import { z } from "zod";

// CSP estrita (checkout, sem `unsafe-eval`): o zod sonda `new Function` para ligar o modo JIT e a
// sonda aparece como violação (`securitypolicyviolation`) mesmo com o erro engolido. `jitless` pula
// a sonda; o custo é desprezível com schemas deste tamanho. Todo schema do app importa `z` daqui.
z.config({ jitless: true });

export { z };
