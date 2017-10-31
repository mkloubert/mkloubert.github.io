"use strict";
// The MIT License (MIT)
// 
// node-enumerable (https://github.com/mkloubert/node-enumerable)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
/**
 * node-enumerable (https://github.com/mkloubert/node-enumerable)
 *
 * Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
 */
var Enumerable;
(function (Enumerable) {
    /**
     * Indicates that something is empty.
     */
    Enumerable.IS_EMPTY = Symbol('IS_EMPTY');
    /**
     * Indicates that something is an enumerable (sequence).
     */
    Enumerable.IS_ENUMERABLE = Symbol('IS_ENUMERABLE');
    /**
     * Indicates if something was not found.
     */
    Enumerable.NOT_FOUND = Symbol('NOT_FOUND');
    /**
     * A basic sequence.
     */
    class EnumerableBase {
        constructor() {
            /**
             * Stores the current index.
             */
            this._index = -1;
            /**
             * Indicates that that instance is an enumerable (sequence).
             */
            this.IS_ENUMERABLE = Enumerable.IS_ENUMERABLE;
        }
        /** @inheritdoc */
        [Symbol.iterator]() {
            return this;
        }
        /** @inheritdoc */
        aggregate(func, seed, resultSelector) {
            if (!func) {
                func = (acc, item) => acc + item;
            }
            if (!resultSelector) {
                resultSelector = (acc) => acc;
            }
            let acc = seed;
            for (let item of this) {
                acc = func(acc, item);
            }
            return resultSelector(acc);
        }
        /** @inheritdoc */
        all(predicate) {
            predicate = toPredicateSafe(predicate);
            for (let item of this) {
                if (!predicate(item)) {
                    return false;
                }
            }
            return true;
        }
        /** @inheritdoc */
        any(predicate) {
            predicate = toPredicateSafe(predicate);
            for (let item of this) {
                if (predicate(item)) {
                    return true;
                }
            }
            return false;
        }
        /** @inheritdoc */
        async(action, previousValue) {
            let me = this;
            return new Promise((resolve, reject) => {
                let asyncResult;
                const ASYNC_COMPLETED = (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(asyncResult);
                    }
                };
                try {
                    let i = -1;
                    let prevVal = previousValue;
                    let val;
                    const NEXT_ITEM = () => {
                        ++i;
                        const ITEM = this.next();
                        if (!ITEM || ITEM.done) {
                            ASYNC_COMPLETED(null);
                            return;
                        }
                        const CTX = {
                            cancel: function (result) {
                                if (arguments.length > 0) {
                                    asyncResult = result;
                                }
                                ASYNC_COMPLETED(null);
                            },
                            index: i,
                            isFirst: 0 === i,
                            item: ITEM.value,
                            previousValue: prevVal,
                            reject: function (reason, result) {
                                if (arguments.length > 1) {
                                    asyncResult = result;
                                }
                                ASYNC_COMPLETED(reason);
                            },
                            resolve: function (nextValue) {
                                prevVal = nextValue;
                                NEXT_ITEM();
                            },
                            result: undefined,
                            sequence: me,
                            value: undefined,
                        };
                        // ctx.result
                        Object.defineProperty(CTX, 'result', {
                            get: () => { return asyncResult; },
                            set: (newValue) => { asyncResult = newValue; },
                            enumerable: true,
                        });
                        // ctx.value
                        Object.defineProperty(CTX, 'value', {
                            get: () => { return val; },
                            set: (newValue) => { val = newValue; },
                            enumerable: true,
                        });
                        try {
                            if (action) {
                                action(CTX);
                            }
                            else {
                                CTX.resolve();
                            }
                        }
                        catch (e) {
                            CTX.reject(e);
                        }
                    };
                    NEXT_ITEM();
                }
                catch (e) {
                    ASYNC_COMPLETED(e);
                }
            });
        }
        /** @inheritdoc */
        average(selector) {
            if (!selector) {
                selector = (i) => i;
            }
            let count = 0;
            let sum = 0.0;
            for (let n of this.select(selector)) {
                if (!isNullOrUndefined(n)) {
                    if ('number' !== typeof n) {
                        n = parseFloat(toStringSafe(n).trim());
                    }
                }
                ++count;
                sum += n;
            }
            return count > 0 ? (sum / count)
                : Enumerable.IS_EMPTY;
        }
        /** @inheritdoc */
        get canReset() {
            return false;
        }
        /** @inheritdoc */
        cast(type) {
            type = toStringSafe(type).trim();
            return this.select((x) => {
                if ('' !== type) {
                    switch (type) {
                        case 'bool':
                        case 'boolean':
                            x = !!x;
                            break;
                        case 'float':
                            x = parseFloat(toStringSafe(x).trim());
                            break;
                        case 'func':
                        case 'function':
                            if ('function' !== typeof x) {
                                const FUNC_RESULT = x;
                                x = function () {
                                    return FUNC_RESULT;
                                };
                            }
                            break;
                        case 'null':
                            x = null;
                            break;
                        case 'number':
                            if ('number' !== typeof x) {
                                x = parseFloat(toStringSafe(x).trim());
                            }
                            break;
                        case 'object':
                            if (!isNullOrUndefined(x)) {
                                if ('object' !== typeof x) {
                                    x = JSON.parse(toStringSafe(x));
                                }
                            }
                            break;
                        case 'int':
                        case 'integer':
                            x = parseInt(toStringSafe(x).trim());
                            break;
                        case 'string':
                            x = '' + x;
                            break;
                        case 'symbol':
                            if ('symbol' !== typeof x) {
                                let desc = x;
                                if (!isNullOrUndefined(desc)) {
                                    if ('number' !== typeof desc) {
                                        desc = toStringSafe(desc);
                                    }
                                }
                                x = Symbol(desc);
                            }
                            break;
                        case 'undefined':
                            x = undefined;
                            break;
                        default:
                            throw 'Not supported type ' + type;
                    }
                }
                return x;
            });
        }
        /** @inheritdoc */
        clone(count, itemSelector) {
            count = parseInt(toStringSafe(count).trim());
            return from(this.cloneInner(count, itemSelector));
        }
        /**
         * @see concatArray()
         */
        *cloneInner(count, itemSelector) {
            const ITEMS = this.toArray();
            while (true) {
                if (!isNaN(count)) {
                    if (count-- < 1) {
                        break;
                    }
                }
                let seq = from(ITEMS);
                if (itemSelector) {
                    seq = seq.select(itemSelector);
                }
                yield seq;
            }
        }
        /** @inheritdoc */
        concat(...args) {
            return this.concatArray(args);
        }
        /** @inheritdoc */
        concatArray(sequences) {
            return from(this.concatArrayInner(sequences));
        }
        /**
         * @see concatArray()
         */
        *concatArrayInner(sequences) {
            for (let item of this) {
                yield item;
            }
            if (sequences) {
                for (let i = 0; i < sequences.length; i++) {
                    const SEQ = sequences[i];
                    for (let item of from(SEQ)) {
                        yield item;
                    }
                }
            }
        }
        /** @inheritdoc */
        contains(item, comparer) {
            return this.indexOf(item, comparer) > -1;
        }
        /** @inheritdoc */
        count(predicate) {
            predicate = toPredicateSafe(predicate);
            let cnt = 0;
            for (let item of this) {
                if (predicate(item)) {
                    ++cnt;
                }
            }
            return cnt;
        }
        /** @inheritdoc */
        get current() {
            return this._current;
        }
        /** @inheritdoc */
        defaultIfEmpty(...defaultItems) {
            return from(this.defaultIfEmptyInner(defaultItems));
        }
        /**
         * @see defaultIfEmpty()
         */
        *defaultIfEmptyInner(defaultItems) {
            let hasItems = false;
            for (let item of this) {
                hasItems = true;
                yield item;
            }
            if (!hasItems && defaultItems) {
                for (let item of defaultItems) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        defaultSequenceIfEmpty(defaultSequence) {
            return from(this.defaultSequenceIfEmptyInner(defaultSequence));
        }
        /**
         * @see defaultIfEmpty()
         */
        *defaultSequenceIfEmptyInner(defaultSequence) {
            let hasItems = false;
            for (let item of this) {
                hasItems = true;
                yield item;
            }
            if (!hasItems) {
                for (let item of from(defaultSequence)) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        distinct(comparer) {
            return this.distinctBy(x => x, comparer);
        }
        /** @inheritdoc */
        distinctBy(selector, comparer) {
            if (!selector) {
                selector = (i) => i;
            }
            comparer = toEqualityComparerSafe(comparer);
            return from(this.distinctByInner(selector, comparer));
        }
        /**
         * @see distinct()
         */
        *distinctByInner(selector, comparer) {
            const TEMP = [];
            for (let item of this) {
                const KEY_ITEM = selector(item);
                let found = false;
                for (let t of TEMP) {
                    if (comparer(KEY_ITEM, t)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    TEMP.push(KEY_ITEM);
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        each(action) {
            return this.forEach
                .apply(this, arguments);
        }
        /** @inheritdoc */
        elementAt(index) {
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            const ITEM = this.elementAtOrDefault(index, ELEMENT_NOT_FOUND);
            if (ELEMENT_NOT_FOUND === ITEM) {
                throw "Element not found";
            }
            return ITEM;
        }
        /** @inheritdoc */
        elementAtOrDefault(index, defaultValue) {
            index = parseInt(toStringSafe(index).trim());
            if (arguments.length < 2) {
                defaultValue = Enumerable.NOT_FOUND;
            }
            let i = -1;
            for (let item of this) {
                if (++i === index) {
                    return item;
                }
            }
            return defaultValue;
        }
        /** @inheritdoc */
        except(second, comparer) {
            return from(this.exceptInner(from(second).distinct()
                .toArray(), toEqualityComparerSafe(comparer)));
        }
        /**
         * @see except()
         */
        *exceptInner(second, comparer) {
            for (let item of this) {
                let found = false;
                for (let secondItem of second) {
                    if (comparer(item, secondItem)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        first(predicate) {
            predicate = toPredicateSafe(predicate);
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            const RESULT = this.firstOrDefault(predicate, ELEMENT_NOT_FOUND);
            if (ELEMENT_NOT_FOUND === RESULT) {
                throw 'Element not found';
            }
            return RESULT;
        }
        /** @inheritdoc */
        firstOrDefault(predicateOrDefaultValue, defaultValue) {
            const ARGS = getOrDefaultArguments(predicateOrDefaultValue, defaultValue, arguments.length);
            for (let item of this) {
                if (ARGS.predicate(item)) {
                    return item;
                }
            }
            return ARGS.defaultValue;
        }
        /** @inheritdoc */
        forEach(action) {
            let i = -1;
            for (let item of this) {
                ++i;
                if (action) {
                    action(item, i);
                }
            }
            return this;
        }
        /** @inheritdoc */
        groupBy(keySelector, keyEqualityComparer) {
            if (!keySelector) {
                keySelector = (i) => i;
            }
            keyEqualityComparer = toEqualityComparerSafe(keyEqualityComparer);
            return from(this.groupByInner(keySelector, keyEqualityComparer));
        }
        /**
         * @see groupBy()
         */
        *groupByInner(keySelector, keyEqualityComparer) {
            ;
            const GROUP_LIST = [];
            for (let item of this) {
                const KEY = keySelector(item);
                let grp;
                for (let g of GROUP_LIST) {
                    if (keyEqualityComparer(KEY, g.key)) {
                        grp = g;
                        break;
                    }
                }
                if (!grp) {
                    grp = {
                        key: KEY,
                        values: [],
                    };
                    GROUP_LIST.push(grp);
                }
                grp.values
                    .push(item);
            }
            for (let grp of GROUP_LIST) {
                yield new Grouping(grp.key, from(grp.values));
            }
        }
        /** @inheritdoc */
        groupJoin(inner, outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer) {
            if (!outerKeySelector && !innerKeySelector) {
                outerKeySelector = (i) => i;
                innerKeySelector = outerKeySelector;
            }
            else {
                if (!outerKeySelector) {
                    outerKeySelector = innerKeySelector;
                }
                else if (!innerKeySelector) {
                    innerKeySelector = outerKeySelector;
                }
            }
            if (!resultSelector) {
                resultSelector = (outer, inner) => {
                    // JoinedItems<T, IEnumerable<TInner>>
                    return {
                        inner: inner,
                        outer: outer,
                    };
                };
            }
            keyEqualityComparer = toEqualityComparerSafe(keyEqualityComparer);
            return from(this.groupJoinInner(from(inner), outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer));
        }
        /**
         * @see groupJoin()
         */
        *groupJoinInner(inner, outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer) {
            const OUTER_GROUPS = createGroupArrayForSequence(this, outerKeySelector);
            const INNER_GROUPS = createGroupArrayForSequence(inner, innerKeySelector);
            while (OUTER_GROUPS.length > 0) {
                const OUTER_GRP = OUTER_GROUPS.shift();
                for (let i = 0; i < INNER_GROUPS.length; i++) {
                    const INNER_GRP = INNER_GROUPS[i];
                    if (!keyEqualityComparer(OUTER_GRP.key, INNER_GRP.key)) {
                        continue;
                    }
                    for (let j = 0; j < OUTER_GRP.values.length; j++) {
                        yield resultSelector(OUTER_GRP.values[j], from(INNER_GRP.values));
                    }
                }
            }
        }
        /** @inheritdoc */
        get index() {
            return this._index;
        }
        /** @inheritdoc */
        indexOf(item, comparer) {
            let index = -1;
            comparer = toEqualityComparerSafe(comparer);
            for (let thisItem of this) {
                ++index;
                if (comparer(thisItem, item)) {
                    return index;
                }
            }
            return -1;
        }
        /** @inheritdoc */
        intersect(second, comparer) {
            return from(this.intersectInner(from(second).distinct()
                .toArray(), toEqualityComparerSafe(comparer)));
        }
        /**
         * @see intersect()
         */
        *intersectInner(second, comparer) {
            for (let item of this) {
                for (let secondItem of second) {
                    if (comparer(item, secondItem)) {
                        yield item;
                        break;
                    }
                }
            }
        }
        /** @inheritdoc */
        join(inner, outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer) {
            if (!outerKeySelector && !innerKeySelector) {
                outerKeySelector = (i) => i;
                innerKeySelector = outerKeySelector;
            }
            else {
                if (!outerKeySelector) {
                    outerKeySelector = innerKeySelector;
                }
                else if (!innerKeySelector) {
                    innerKeySelector = outerKeySelector;
                }
            }
            if (!resultSelector) {
                resultSelector = (outer, inner) => {
                    // JoinedItems<T, TInner>
                    return {
                        inner: inner,
                        outer: outer,
                    };
                };
            }
            keyEqualityComparer = toEqualityComparerSafe(keyEqualityComparer);
            return from(this.joinInner(from(inner), outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer));
        }
        /**
         * @see join()
         */
        *joinInner(inner, outerKeySelector, innerKeySelector, resultSelector, keyEqualityComparer) {
            const OUTER_GROUPS = createGroupArrayForSequence(this, outerKeySelector);
            const INNER_GROUPS = createGroupArrayForSequence(inner, innerKeySelector);
            while (OUTER_GROUPS.length > 0) {
                const OUTER_GRP = OUTER_GROUPS.shift();
                for (let i = 0; i < INNER_GROUPS.length; i++) {
                    const INNER_GRP = INNER_GROUPS[i];
                    if (!keyEqualityComparer(OUTER_GRP.key, INNER_GRP.key)) {
                        continue;
                    }
                    for (let j = 0; j < OUTER_GRP.values.length; j++) {
                        for (let k = 0; k < INNER_GRP.values.length; k++) {
                            yield resultSelector(OUTER_GRP.values[j], INNER_GRP.values[k]);
                        }
                    }
                }
            }
        }
        /** @inheritdoc */
        joinToString(separator) {
            return this.toArray()
                .join(toStringSafe(separator));
        }
        /** @inheritdoc */
        last(predicate) {
            predicate = toPredicateSafe(predicate);
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            const RESULT = this.lastOrDefault(predicate, ELEMENT_NOT_FOUND);
            if (ELEMENT_NOT_FOUND === RESULT) {
                throw 'Element not found';
            }
            return RESULT;
        }
        /** @inheritdoc */
        lastIndexOf(item, comparer) {
            let index = -1;
            let lastIndex = -1;
            comparer = toEqualityComparerSafe(comparer);
            for (let thisItem of this) {
                ++index;
                if (comparer(thisItem, item)) {
                    lastIndex = index;
                }
            }
            return lastIndex;
        }
        /** @inheritdoc */
        lastOrDefault(predicateOrDefaultValue, defaultValue) {
            const ARGS = getOrDefaultArguments(predicateOrDefaultValue, defaultValue, arguments.length);
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            let result = ELEMENT_NOT_FOUND;
            for (let item of this) {
                if (ARGS.predicate(item)) {
                    result = item;
                }
            }
            if (ELEMENT_NOT_FOUND !== result) {
                return result;
            }
            return ARGS.defaultValue;
        }
        /** @inheritdoc */
        makeResettable() {
            if (this.canReset) {
                return this;
            }
            return from(this.toArray());
        }
        /** @inheritdoc */
        max(valueSelector, comparer) {
            if (!valueSelector) {
                valueSelector = (i) => i;
            }
            comparer = toComparerSafe(comparer);
            let result = Enumerable.IS_EMPTY;
            let maxValue;
            let isFirst = true;
            for (let item of this) {
                const VALUE = valueSelector(item);
                const UPDATE_RESULT = () => {
                    result = item;
                    maxValue = VALUE;
                };
                if (!isFirst) {
                    if (comparer(VALUE, maxValue) > 0) {
                        UPDATE_RESULT();
                    }
                }
                else {
                    isFirst = false;
                    UPDATE_RESULT();
                }
            }
            return result;
        }
        /** @inheritdoc */
        min(valueSelector, comparer) {
            if (!valueSelector) {
                valueSelector = (i) => i;
            }
            comparer = toComparerSafe(comparer);
            let result = Enumerable.IS_EMPTY;
            let minValue;
            let isFirst = true;
            for (let item of this) {
                const VALUE = valueSelector(item);
                const UPDATE_RESULT = () => {
                    result = item;
                    minValue = VALUE;
                };
                if (!isFirst) {
                    if (comparer(VALUE, minValue) < 0) {
                        UPDATE_RESULT();
                    }
                }
                else {
                    isFirst = false;
                    UPDATE_RESULT();
                }
            }
            return result;
        }
        /** @inheritdoc */
        noNAN(checkForInt) {
            return this.where(x => {
                const STR = toStringSafe(x).trim();
                return !isNaN(!checkForInt ? parseFloat(STR) : parseInt(STR));
            });
        }
        /** @inheritdoc */
        notEmpty() {
            return this.where(x => !!x);
        }
        /** @inheritdoc */
        ofType(type) {
            type = toStringSafe(type).trim();
            return this.where(x => {
                return type.toLowerCase() === typeof x ||
                    '' === type;
            });
        }
        /** @inheritdoc */
        order(comparer) {
            return this.orderBy(x => x, comparer);
        }
        /** @inheritdoc */
        orderBy(selector, comparer) {
            return new OrderedEnumerable(this, selector, comparer);
        }
        /** @inheritdoc */
        orderByDescending(selector, comparer) {
            comparer = toComparerSafe(comparer);
            return this.orderBy(selector, (x, y) => {
                return comparer(y, x);
            });
        }
        /** @inheritdoc */
        orderDescending(comparer) {
            return this.orderByDescending(x => x, comparer);
        }
        /** @inheritdoc */
        product() {
            return this.aggregate((acc, x) => Enumerable.IS_EMPTY !== acc ? (acc * x) : x, Enumerable.IS_EMPTY);
        }
        /** @inheritdoc */
        pushTo(stack) {
            if (stack) {
                stack.push
                    .apply(stack, this.toArray());
            }
            return this;
        }
        /** @inheritdoc */
        reset() {
            throw 'Not supported';
        }
        /** @inheritdoc */
        reverse() {
            let i = Number.MIN_SAFE_INTEGER;
            return this.orderByDescending(() => {
                return i++;
            });
        }
        /** @inheritdoc */
        select(selector) {
            if (!selector) {
                selector = (x) => x;
            }
            return this.selectMany(x => {
                return [selector(x)];
            });
        }
        /** @inheritdoc */
        selectMany(selector) {
            return from(this.selectManyInner(selector));
        }
        /**
         * @see selectMany()
         */
        *selectManyInner(selector) {
            if (!selector) {
                selector = (x) => [x];
            }
            for (let s of this) {
                const SEQ = from(selector(s));
                for (let item of SEQ) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        sequenceEqual(other, equalityComparer) {
            const OTHER_SEQ = from(other);
            equalityComparer = toEqualityComparerSafe(equalityComparer);
            do {
                const X = getNextIteratorResultSafe(this);
                if (X.done) {
                    break;
                }
                const Y = getNextIteratorResultSafe(OTHER_SEQ);
                if (Y.done) {
                    return false;
                }
                if (!equalityComparer(X.value, Y.value)) {
                    return false;
                }
            } while (true);
            if (!getNextIteratorResultSafe(OTHER_SEQ).done) {
                return false;
            }
            return true;
        }
        /** @inheritdoc */
        single(predicate) {
            predicate = toPredicateSafe(predicate);
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            const ITEM = this.singleOrDefault(predicate, ELEMENT_NOT_FOUND);
            if (ELEMENT_NOT_FOUND === ITEM) {
                throw 'Element not found';
            }
            return ITEM;
        }
        /** @inheritdoc */
        singleOrDefault(predicateOrDefaultValue, defaultValue) {
            const ARGS = getOrDefaultArguments(predicateOrDefaultValue, defaultValue, arguments.length);
            const ELEMENT_NOT_FOUND = Symbol('ELEMENT_NOT_FOUND');
            let result = ELEMENT_NOT_FOUND;
            for (let item of this) {
                if (!ARGS.predicate(item)) {
                    continue;
                }
                if (ELEMENT_NOT_FOUND !== result) {
                    throw 'Sequence contains more that one matching element';
                }
                result = item;
            }
            if (ELEMENT_NOT_FOUND !== result) {
                return result;
            }
            return ARGS.defaultValue;
        }
        /** @inheritdoc */
        skip(count) {
            count = parseInt(toStringSafe(count).trim());
            if (isNaN(count)) {
                count = 1;
            }
            return this.skipWhile(() => {
                return count-- > 0;
            });
        }
        /** @inheritdoc */
        skipLast() {
            return from(this.skipLastInner());
        }
        /**
         * @see skipLast()
         */
        *skipLastInner() {
            let hasRemainingItems;
            let isFirst = true;
            let item;
            do {
                const ITERATOR_ITEM = this.next();
                hasRemainingItems = ITERATOR_ITEM && !ITERATOR_ITEM.done;
                if (!hasRemainingItems) {
                    continue;
                }
                if (!isFirst) {
                    yield item;
                }
                else {
                    isFirst = false;
                }
                item = ITERATOR_ITEM.value;
            } while (hasRemainingItems);
        }
        /** @inheritdoc */
        skipWhile(predicate) {
            return from(this.skipWhileInner(predicate));
        }
        /**
         * @see takeWhile()
         */
        *skipWhileInner(predicate) {
            predicate = toPredicateSafe(predicate);
            let returnItem = false;
            for (let item of this) {
                if (!returnItem && !predicate(item)) {
                    returnItem = true;
                }
                if (returnItem) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        sum() {
            return this.aggregate((acc, x) => Enumerable.IS_EMPTY !== acc ? (acc + x) : x, Enumerable.IS_EMPTY);
        }
        /** @inheritdoc */
        take(count) {
            count = parseInt(toStringSafe(count).trim());
            if (isNaN(count)) {
                count = 1;
            }
            return this.takeWhile(() => {
                return count-- > 0;
            });
        }
        /** @inheritdoc */
        takeWhile(predicate) {
            return from(this.takeWhileInner(predicate));
        }
        /**
         * @see takeWhile()
         */
        *takeWhileInner(predicate) {
            predicate = toPredicateSafe(predicate);
            for (let item of this) {
                if (predicate(item)) {
                    yield item;
                }
                else {
                    break;
                }
            }
        }
        /** @inheritdoc */
        toArray() {
            const ARR = [];
            for (let i of this) {
                ARR.push(i);
            }
            return ARR;
        }
        /** @inheritdoc */
        toLookup(keySelector, keyEqualityComparer) {
            const LOOKUP = {};
            for (let grp of this.groupBy(keySelector, keyEqualityComparer)) {
                LOOKUP[grp.key] = grp;
            }
            return LOOKUP;
        }
        /** @inheritdoc */
        toObject(keySelector) {
            if (!keySelector) {
                keySelector = (item, index) => index;
            }
            const OBJ = {};
            let i = -1;
            for (let item of this) {
                ++i;
                OBJ[keySelector(item, i)] = item;
            }
            return OBJ;
        }
        /** @inheritdoc */
        union(second, comparer) {
            return this.concat(second)
                .distinct(comparer);
        }
        /** @inheritdoc */
        where(predicate) {
            return from(this.whereInner(predicate));
        }
        /**
         * @see where()
         */
        *whereInner(predicate) {
            predicate = toPredicateSafe(predicate);
            for (let item of this) {
                if (predicate(item)) {
                    yield item;
                }
            }
        }
        /** @inheritdoc */
        zip(second, resultSelector) {
            return from(this.zipInner(from(second), resultSelector));
        }
        /**
         * @see zip()
         */
        *zipInner(second, resultSelector) {
            if (!resultSelector) {
                resultSelector = (x, y) => x + y;
            }
            let i = -1;
            do {
                const ITEM_THIS = this.next();
                if (!ITEM_THIS || ITEM_THIS.done) {
                    break;
                }
                const ITEM_SECOND = second.next();
                if (!ITEM_SECOND || ITEM_SECOND.done) {
                    break;
                }
                yield resultSelector(ITEM_THIS.value, ITEM_SECOND.value, ++i);
            } while (true);
        }
    } // EnumerableBase<T>
    Enumerable.EnumerableBase = EnumerableBase;
    /**
     * Wraps a sequence.
     *
     * @template T Type of the items.
     */
    class EnumerableWrapper extends EnumerableBase {
        /**
         * Intializes a new instance of that class.
         *
         * @param {IEnumerable<T>} [seq] The sequence to wrap.
         */
        constructor(seq) {
            super();
            this._sequence = seq;
        }
        /** @inheritdoc */
        get canReset() {
            return this._sequence.canReset;
        }
        /** @inheritdoc */
        get current() {
            return this._sequence.current;
        }
        /** @inheritdoc */
        next() {
            return this._sequence.next();
        }
        /** @inheritdoc */
        reset() {
            this._sequence.reset();
            return this;
        }
    } // EnumerableWrapper<T>
    Enumerable.EnumerableWrapper = EnumerableWrapper;
    /**
     * A sequence based on an Iterator<T>.
     */
    class IteratorEnumerable extends EnumerableBase {
        /**
         * Initializes a new instance of that class.
         *
         * @param {Iterator<T>} [iterator] The underlying iterator.
         */
        constructor(iterator) {
            super();
            this._iterator = iterator;
            if (isNullOrUndefined(this._iterator)) {
                this._iterator = emptyIterator();
            }
        }
        /** @inheritdoc */
        next(value) {
            let result = this._iterator.next(value);
            if (!result) {
                result = {
                    value: undefined,
                    done: true,
                };
            }
            this._current = result;
            if (!result.done) {
                ++this._index;
            }
            return result;
        }
    } // IteratorEnumerable<T>
    Enumerable.IteratorEnumerable = IteratorEnumerable;
    /**
     * A sequence based on an array.
     */
    class ArrayEnumerable extends EnumerableBase {
        /**
         * Initializes a new instance of that class.
         *
         * @param {ArrayLike<T>} [arr] The underlying array.
         */
        constructor(arr) {
            super();
            this._array = arr;
            if (isNullOrUndefined(this._array)) {
                this._array = [];
            }
        }
        /** @inheritdoc */
        get canReset() {
            return true;
        }
        /** @inheritdoc */
        next() {
            let result;
            const NEXT_INDEX = this._index + 1;
            if (NEXT_INDEX >= this._array.length) {
                result = {
                    done: true,
                    value: undefined,
                };
            }
            else {
                this._index = NEXT_INDEX;
                result = {
                    done: false,
                    value: this._array[NEXT_INDEX],
                };
            }
            this._current = result;
            return result;
        }
        /** @inheritdoc */
        reset() {
            if (this.canReset) {
                this._index = -1;
            }
            else {
                return super.reset();
            }
            return this;
        }
    } // ArrayEnumerable<T>
    Enumerable.ArrayEnumerable = ArrayEnumerable;
    /**
     * A grouping.
     *
     * @template T Type of the items.
     * @template TKey Type of the key.
     */
    class Grouping extends EnumerableWrapper {
        /**
         * Initializes a new instance of that class.
         *
         * @param {TKey} key The key.
         * @param {IEnumerable} seq The items of the grouping.
         */
        constructor(key, seq) {
            super(seq);
            this._key = key;
        }
        /** @inheritdoc */
        get key() {
            return this._key;
        }
    } // Grouping<TKey, T>
    Enumerable.Grouping = Grouping;
    /**
     * An ordered sequence.
     *
     * @template T Type of the items.
     * @template U Type of the sort keys.
     */
    class OrderedEnumerable extends EnumerableWrapper {
        /**
         * Initializes a new instance of that class.
         *
         * @param {IEnumerable<T>} seq The source sequence.
         * @param {Selector<T,U>} selector The selector for the sort values.
         * @param {Comparer<U,U>} comparer The comparer to use.
         */
        constructor(seq, selector, comparer) {
            super(seq);
            const ME = this;
            this._orderComparer = toComparerSafe(comparer);
            if (!selector) {
                selector = (i) => i;
            }
            this._orderSelector = selector;
            this._originalItems = seq.toArray();
            this._sequence = from(this._originalItems.map(x => {
                return {
                    sortBy: ME.selector(x),
                    value: x,
                };
            }).sort(function (x, y) {
                return ME.comparer(x.sortBy, y.sortBy);
            }).map(function (x) {
                return x.value;
            }));
        }
        /**
         * Gets the comparer.
         */
        get comparer() {
            return this._orderComparer;
        }
        /**
         * Gets the selector.
         */
        get selector() {
            return this._orderSelector;
        }
        /** @inheritdoc */
        then(comparer) {
            return this.thenBy(x => x, comparer);
        }
        /** @inheritdoc */
        thenBy(selector, comparer) {
            if (!selector) {
                selector = (i) => i;
            }
            comparer = toComparerSafe(comparer);
            const THIS_SELECTOR = this.selector;
            const THIS_COMPARER = this.comparer;
            return from(this._originalItems)
                .orderBy(x => {
                return {
                    level_0: THIS_SELECTOR(x),
                    level_1: selector(x),
                };
            }, (x, y) => {
                const COMP_0 = THIS_COMPARER(x.level_0, y.level_0);
                if (0 != COMP_0) {
                    return COMP_0;
                }
                const COMP_1 = comparer(x.level_1, y.level_1);
                if (0 != COMP_1) {
                    return COMP_1;
                }
                return 0;
            });
        }
        /** @inheritdoc */
        thenByDescending(selector, comparer) {
            if (!selector) {
                selector = (i) => i;
            }
            comparer = toComparerSafe(comparer);
            return this.thenBy(selector, (x, y) => comparer(y, x));
        }
        /** @inheritdoc */
        thenDescending(comparer) {
            return this.thenByDescending(x => x, comparer);
        }
    } // OrderedEnumerable<T, U = T>
    Enumerable.OrderedEnumerable = OrderedEnumerable;
    /**
     * Keeps sure that a value is a sequence.
     *
     * @param {any} val The value to cast (if needed).
     *
     * @return {IEnumerable<T>} The value as sequence. Can return (null) or (undefined), if 'val' is one of these values.
     */
    function asEnumerable(val) {
        if (isNullOrUndefined(val)) {
            return val;
        }
        if (isEnumerable(val)) {
            return val;
        }
        return from(val);
    }
    Enumerable.asEnumerable = asEnumerable;
    /**
     * Returns a value as function.
     *
     * @param {any} val The function or a value that can be converted to a lambda expression string.
     * @param {boolean} throwException Throw an exception on parse errors or return (false).
     *
     * @return {T} 'val' as function or (false) on error, if 'throwException' is (false).
     *             Can be (null) or (undefined) if 'val' has a same value or is an empty string (representation).
     */
    function asFunc(val, throwException = true) {
        if ('function' === typeof val) {
            return val;
        }
        if (isNullOrUndefined(val)) {
            return val;
        }
        const LAMBDA = toStringSafe(val);
        if ('' === LAMBDA.trim()) {
            return undefined;
        }
        const MATCHES = LAMBDA.match(/^(\s*)([\(]?)([^\)]*)([\)]?)(\s*)(=>)/m);
        if (MATCHES) {
            if ((("" === MATCHES[2]) && ("" !== MATCHES[4])) ||
                (("" !== MATCHES[2]) && ("" === MATCHES[4]))) {
                if (throwException) {
                    throw "Syntax error in '" + LAMBDA + "' expression";
                }
                return false;
            }
            let lambdaBody = LAMBDA.substr(MATCHES[0].length)
                .trim();
            if ("" !== lambdaBody) {
                if (';' !== lambdaBody.substr(-1)) {
                    lambdaBody = 'return ' + lambdaBody + ';';
                }
            }
            let func;
            eval('func = function(' + MATCHES[3] + ') { ' + lambdaBody + ' };');
            return func;
        }
        if (throwException) {
            throw "'" + val + "' is no valid lambda expression";
        }
        return false;
    }
    Enumerable.asFunc = asFunc;
    /**
     * Builds a sequence.
     *
     * @template T Type of the items.
     *
     * @param {CancelableFactory<T>} factory The factory function.
     * @param {number} [count] The maximum number of items.
     *
     * @returns {IEnumerable<T>}
     */
    function build(factory, count) {
        count = parseInt(toStringSafe(count).trim());
        return from(buildInner(factory, count));
    } // build<T>()
    Enumerable.build = build;
    function* buildInner(factory, count) {
        let i = -1;
        let run = true;
        while (run) {
            ++i;
            if (!isNaN(count)) {
                if (i >= count) {
                    run = false;
                    continue;
                }
            }
            const CANCEL = function (flag) {
                if (arguments.length < 1) {
                    flag = true;
                }
                run = !flag;
            };
            const NEW_ITEM = factory(CANCEL, i);
            if (run) {
                yield NEW_ITEM;
            }
        }
    }
    /**
     * Builds a flatten sequence of sequences.
     *
     * @template T Type of the items.
     * @param {CancelableFactory<Sequence<T>>} factory The factory.
     * @param {number} [count] The maximum number of invocations.
     *
     * @returns {IEnumerable<T>} The flatten list of items.
     */
    function buildMany(factory, count) {
        count = parseInt(toStringSafe(count).trim());
        return from(buildManyInner(factory, count));
    } // buildMany<T>()
    Enumerable.buildMany = buildMany;
    function* buildManyInner(factory, count) {
        let i = -1;
        let run = true;
        while (run) {
            ++i;
            if (!isNaN(count)) {
                if (i >= count) {
                    run = false;
                    continue;
                }
            }
            const CANCEL = function (flag) {
                if (arguments.length < 1) {
                    flag = true;
                }
                run = !flag;
            };
            const SEQ = factory(CANCEL, i);
            if (run) {
                if (!isNullOrUndefined(SEQ)) {
                    for (let item of SEQ) {
                        yield item;
                    }
                }
            }
        }
    }
    /**
     * Creates a new sequence from a list of items.
     *
     * @template T Type of the items.
     *
     * @param {...Array<T>} items The items for the sequence.
     *
     * @returns {IEnumerable<T>} The new sequence.
     */
    function create(...items) {
        return from(items);
    } // create<T = any>()
    Enumerable.create = create;
    /**
     * Creates an empty sequence.
     *
     * @template T The type of the sequence.
     *
     * @returns {IEnumerable<T>} The new, empty sequence.
     */
    function empty() {
        return from(emptyIterator());
    } // empty<T = any>()
    Enumerable.empty = empty;
    /**
     * Creates a new sequence.
     *
     * @param {Sequence<T>} seq The input data.
     *
     * @return {IEnumerable<T>} The new sequence.
     */
    function from(seq) {
        if (isNullOrUndefined(seq)) {
            seq = [];
        }
        if (Array.isArray(seq)) {
            return new ArrayEnumerable(seq);
        }
        if ('string' === typeof seq) {
            return fromString(seq);
        }
        return new IteratorEnumerable(seq);
    } // from<T>()
    Enumerable.from = from;
    /**
     * Creates a new sequence from the string representation of a value.
     *
     * @param {any} val The value.
     *
     * @return {IEnumerable<string>} The new sequence.
     */
    function fromString(val) {
        return new ArrayEnumerable(toStringSafe(val).split(''));
    } // fromString()
    Enumerable.fromString = fromString;
    /**
     * Checks if a value represents the IS_EMPTY symbol.
     *
     * @param {any} val The value to check.
     *
     * @returns {boolean} Is IS_EMPTY symbol or not.
     */
    function isEmpty(val) {
        return Enumerable.IS_EMPTY === val;
    } // isEmpty()
    Enumerable.isEmpty = isEmpty;
    /**
     * Checks if a value represents an enumerable (sequence).
     *
     * @param {any} val The value to check.
     *
     * @returns {boolean} Is enumerable (sequence) or not.
     */
    function isEnumerable(val) {
        if (!isNullOrUndefined(val)) {
            return val['IS_ENUMERABLE'] === Enumerable.IS_ENUMERABLE;
        }
        return false;
    } // isEnumerable()
    Enumerable.isEnumerable = isEnumerable;
    /**
     * Checks if a value represents the NOT_FOUND symbol.
     *
     * @param {any} val The value to check.
     *
     * @returns {boolean} Is NOT_FOUND symbol or not.
     */
    function notFound(val) {
        return Enumerable.NOT_FOUND === val;
    } // notFound()
    Enumerable.notFound = notFound;
    /**
     * Creates a range of numbers.
     *
     * @param {number} start The start value.
     * @param {number} [count] The meximum number of values.
     *
     * @returns {IEnumerable<number>} The new sequence.
     */
    function range(start, count) {
        start = parseFloat(toStringSafe(start).trim());
        if (isNaN(start)) {
            start = 0;
        }
        count = parseInt(toStringSafe(count).trim());
        return from(rangeInner(start, count));
    } // range()
    Enumerable.range = range;
    function* rangeInner(start, count) {
        let current = start;
        while (true) {
            if (!isNaN(count)) {
                if (count-- < 1) {
                    break;
                }
            }
            yield current++;
        }
    }
    /**
     * Creates a range of numbers.
     *
     * @param {T} item The item to repeat.
     * @param {number} [count] The maximum number of items.
     *
     * @returns {IEnumerable<number>} The new sequence.
     */
    function repeat(item, count) {
        count = parseInt(toStringSafe(count).trim());
        return from(repeatInner(item, count));
    } // repeat<T>()
    Enumerable.repeat = repeat;
    function* repeatInner(item, count) {
        while (true) {
            if (!isNaN(count)) {
                if (count-- < 1) {
                    break;
                }
            }
            yield item;
        }
    }
    /**
     * Returns a sorted sequence.
     *
     * @template T Type of the items.
     * @template U Type of the keys.
     *
     * @param {Sequence<T>} items The items to sort.
     * @param {Selector<T,U>} [selector] The selector for the keys.
     * @param {Comparer<U>} [comparer] The custom comparer for the keys.
     *
     * @return {IOrderedEnumerable<T>} The sorted sequence.
     */
    function sort(items, selector, comparer) {
        if (!selector) {
            return from(items).order(comparer);
        }
        return from(items).orderBy(selector, comparer);
    }
    Enumerable.sort = sort;
    /**
     * Returns a sorted sequence (descending).
     *
     * @template T Type of the items.
     * @template U Type of the keys.
     *
     * @param {Sequence<T>} items The items to sort.
     * @param {Selector<T,U>} [selector] The selector for the keys.
     * @param {Comparer<U>} [comparer] The custom comparer for the keys.
     *
     * @return {IOrderedEnumerable<T>} The sorted sequence.
     */
    function sortDesc(items, selector, comparer) {
        if (!selector) {
            return from(items).orderDescending(comparer);
        }
        return from(items).orderByDescending(selector, comparer);
    }
    Enumerable.sortDesc = sortDesc;
    function asArray(arr) {
        if (!arr) {
            return arr;
        }
        if (Array.isArray(arr)) {
            return arr;
        }
        const NEW_ARRAY = [];
        for (let i = 0; i < arr.length; i++) {
            NEW_ARRAY.push(arr[i]);
        }
        return NEW_ARRAY;
    }
    function createGroupArrayForSequence(seq, keySelector) {
        return seq.groupBy(keySelector).select(grp => {
            return {
                key: grp.key,
                values: grp.toArray(),
            };
        }).toArray();
    }
    function* emptyIterator() {
        while (false) {
            yield undefined;
        }
    }
    function getOrDefaultArguments(predicateOrDefaultValue, defaultValue, paramCount) {
        let predicate;
        let defVal;
        if (paramCount < 1) {
            defVal = Enumerable.NOT_FOUND;
        }
        else if (paramCount < 2) {
            if ('function' === typeof predicateOrDefaultValue) {
                predicate = predicateOrDefaultValue;
                defVal = Enumerable.NOT_FOUND;
            }
            else {
                defVal = predicateOrDefaultValue;
            }
        }
        else {
            predicate = predicateOrDefaultValue;
            defVal = defaultValue;
        }
        return {
            defaultValue: defVal,
            predicate: toPredicateSafe(predicate),
        };
    }
    function getNextIteratorResultSafe(iterator, defaultValue) {
        let result = iterator.next();
        if (!result) {
            result = {
                done: true,
                value: defaultValue,
            };
        }
        return result;
    }
    function isNullOrUndefined(val) {
        return null === val ||
            'undefined' === typeof val;
    }
    function toComparerSafe(comparer) {
        if (!comparer) {
            comparer = (x, y) => {
                if (x === y) {
                    return 0;
                }
                if (x < y) {
                    return -1;
                }
                if (x > y) {
                    return 1;
                }
                return 0;
            };
        }
        return comparer;
    }
    function toEqualityComparerSafe(comparer) {
        if (!comparer) {
            comparer = (x, y) => x == y;
        }
        else if (true === comparer) {
            comparer = (x, y) => x === y;
        }
        return comparer;
    }
    function toPredicateSafe(predicate, defaultValue = true) {
        if (isNullOrUndefined(predicate)) {
            predicate = () => !!defaultValue;
        }
        if ('function' !== typeof predicate) {
            const RESULT = !!predicate;
            predicate = () => RESULT;
        }
        return predicate;
    }
    function toStringSafe(val) {
        if ('string' === typeof val) {
            return val;
        }
        if (isNullOrUndefined(val)) {
            val = '';
        }
        return '' + val;
    }
})(Enumerable || (Enumerable = {}));

//# sourceMappingURL=index.js.map