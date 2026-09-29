# Crit 7 — Build the ANU system you wish existed

## The breakthrough

Fetching the real ANU data before building anything broke three planning
assumptions, and the one that mattered was COMP6120's requisite: "completed
**or be currently studying** COMP6442." A strictly-earlier prerequisite model
— the obvious first design — would have blocked a course ANU itself permits.
For an app whose entire claim is that it surfaces the truth instead of
withholding it, a false block is worse than no check at all. The prereq
model gained a `concurrent` flag because the data said so, not because the
plan anticipated it.

The second breakthrough was smaller and more uncomfortable: a passing test
that had never been at risk of failing. The `loadBuckets()` sort assertion
compared the loaded buckets to a sorted copy of themselves, and the seed
data arrives pre-sorted, so the comparison could never disagree. Deleting the
sort outright and rerunning the suite left every test green. Green had been
telling me the test existed, not that the behaviour did.

## What it changed

I came in treating a fetched source and a passing test as two different
kinds of evidence — one needs verifying, the other doesn't. They're the same
kind. A page's own prose can contradict itself three sections later, the way
Programs and Courses names one compulsory course two different things
depending on which of its own pages you read; a test can pass for a reason
that has nothing to do with the code being right. The developer I want to be
checks both by trying to break them, not by reading them and moving on. This
also caught me directly: the plan's own CSS violated a rule the plan had
just quoted from its own harness file, three sections down.
