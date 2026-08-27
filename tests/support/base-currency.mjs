/**
 * The base currency for unit tests.
 *
 * Services take the base currency as an injected function rather than reading the
 * process-global cache, because `tsx` can load the same source file under more
 * than one specifier — so priming the cache from a test is not guaranteed to
 * reach the instance the service under test imported. Passing this explicitly is
 * both deterministic and closer to how the composition root wires it.
 */
export const TEST_BASE_CURRENCY = 'COP';

/** Pass as the `baseCurrency` constructor argument. */
export const testBaseCurrency = () => TEST_BASE_CURRENCY;
