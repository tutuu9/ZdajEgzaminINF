import { explainProperty } from '../inspector/explanations';

/** Keep the inspector's reviewed glossary but do not infer meanings from arbitrary prefixes. */
export function reviewedPropertyExplanation(property: string): string | undefined {
  if (
    /^(?:padding|margin)-/.test(property) &&
    !/^(?:padding|margin)-(?:top|right|bottom|left|(?:block|inline)(?:-(?:start|end))?)$/.test(
      property,
    )
  )
    return;
  if (
    property.startsWith('border-') &&
    !/^border-(?:radius|width|style|color|(?:top|right|bottom|left)(?:-(?:width|style|color))?|(?:top|bottom)-(?:left|right)-radius|(?:block|inline)(?:-(?:start|end))?(?:-(?:width|style|color))?)$/.test(
      property,
    )
  )
    return;
  const meaning = explainProperty(property);
  return typeof meaning === 'string' ? meaning : undefined;
}
