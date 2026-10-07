/**
 * Every test in this directory, run by `npm test`.
 *
 * They are two suites that guard one property: what one device writes, the other
 * device has to agree with. The allocator decides who owes what, and the rules
 * mirror decides whether the write is allowed at all.
 */
import './split.test.mts';
import './rules.test.mts';
