# Change B: cached profile reads

Add a reader that caches profiles after their first successful lookup and returns defensive copies. The base application treats profiles as immutable after creation. Do not add profile mutation behavior.
