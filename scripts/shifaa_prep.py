"""
Cleans the Shifaa Arabic Medical Consultations dataset (Apache-2.0) for Sanad:
drops doctor and patient names, the greeting/sign-off boilerplate and contact
details, removes duplicates, and writes a JSONL file ready to load.

usage: python scripts/shifaa_prep.py <train.parquet> <out.jsonl> [limit]
"""
import json
import re
import sys

import pandas as pd

src, out = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 15000

df = pd.read_parquet(src)
df = df.drop_duplicates(["Question Title", "Question"]).copy()

# every doctor name the dataset knows about, longest first so full names win over parts
doctors = set()
for n in df["Doctor Name"].dropna().unique():
    n = re.sub(r"^\s*(?:د\.|الدكتورة?)\s*", "", n).strip()
    if len(n) > 4:
        doctors.add(n)
# well-known doctors people mention by name in their questions
doctors |= {"طارق الحبيب", "جميل القدسي"}


def loose(name: str) -> str:
    # tolerate "عبد العليم" / "عبدالعليم" and extra spaces
    return r"\s*".join(re.escape(w) for w in re.sub(r"عبد\s*", "عبد ", name).split())


def alternation(names) -> str:
    return "|".join(loose(d) for d in sorted(names, key=len, reverse=True))


doctor_re = re.compile(r"(?:(?:ال)?دكتورة?|دكتورنا|د\.)?\s*(?:ال\S+\s*)?[/:]?\s*(?:" + alternation(doctors) + r")")
# "الدكتور عبد العليم": a title followed by the last two words of a known name
surnames = {" ".join(re.sub(r"عبد\s*", "عبد ", d).split()[-2:]) for d in doctors}
surname_re = re.compile(r"(?:(?:ال)?دكتورة?|دكتورنا|د\.)\s*(?:ال\S+\s*)?[/:]?\s*(?:" + alternation(s for s in surnames if len(s) >= 7) + r")")


def drop_doctors(s: str) -> str:
    return surname_re.sub("الطبيب", doctor_re.sub("الطبيب", s))

SALUTE = re.compile(
    r"(?:الأخت?|الابنة?|الأستاذة?|الوالدة?|السائلة?)\s*(?:ال\S+\s*)?(?:ال\S+\s*)?/?\s*[^\n]{0,60}?(?:حفظ\S*|وفق\S*|رعا\S*)\s*الله\S*\.?"
)
PREAMBLE = re.compile(r"^.{0,400}?وبعد\s*:", re.S)
TITLE_DR = re.compile(r"(?:ال)?دكتورة?\s+(?:[^\s،.\n]+\s+){1,3}?(?=استشاري|أخصائي|اختصاصي|،|\.|\n)")
HANDOFF = re.compile(r"^.*(?:انتهت إجابة|وتليها إجابة|تليها إجابة).*$", re.M)
CONTACT = re.compile(r"\S+@\S+\.\S+|https?://\S+|www\.\S+|\+?\d[\d\s-]{7,}\d")
REF_NO = re.compile(r"\(\s*\d{5,8}\s*(?:-\s*\d{5,8}\s*)*\)|رقم\s*:?\s*\d{5,8}")
MY_NAME = re.compile(r"(?:اسمي|أنا اسمي|معك)\s+\S+(?:\s+\S+)?")


def clean_answer(a: str) -> str:
    a = PREAMBLE.sub("", a, count=1)
    a = re.sub(r"^\s*بسم الله الرحمن الرحيم\s*", "", a)
    a = SALUTE.sub("", a)
    a = HANDOFF.sub("", a)
    a = drop_doctors(a)
    a = TITLE_DR.sub("الطبيب ", a)
    a = CONTACT.sub("", a)
    a = REF_NO.sub("", a)
    return tidy(a)


def clean_question(q: str) -> str:
    q = re.sub(r"^\s*السلام عليكم(?: ورحمة الله(?: وبركاته)?)?\s*[.،]?\s*", "", q)
    q = MY_NAME.sub("", q)
    q = drop_doctors(q)
    q = CONTACT.sub("", q)
    q = REF_NO.sub("", q)
    return tidy(q)


def tidy(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n\n", s)
    return s.strip()


df["section"] = df["Hierarchical Diagnosis"].str.split(" - ").str[0].str.strip()
df["year"] = pd.to_numeric(df["Date of Answer"].str[:4], errors="coerce")
df["q"] = df["Question"].map(clean_question)
df["a"] = df["Answer"].map(clean_answer)
df = df[(df.q.str.len().between(30, 1500)) & (df.a.str.len().between(150, 3000))]

# keep the whole drugs section, then the newest consultations from every other section
# in proportion to its size, until the limit
drugs = df[df.section == "الأدوية والمستحضرات"].sort_values("year", ascending=False)
rest = df[df.section != "الأدوية والمستحضرات"]
room = max(limit - len(drugs), 0)
share = (rest.section.value_counts(normalize=True) * room).round().astype(int)
picked = [drugs.head(limit)]
for section, n in share.items():
    picked.append(rest[rest.section == section].sort_values("year", ascending=False).head(n))
final = pd.concat(picked).head(limit)

with open(out, "w", encoding="utf-8") as f:
    for r in final.itertuples():
        f.write(json.dumps({
            "id": f"shifaa-{r._5}",
            "title": r._1.strip(),
            "question": r.q,
            "answer": r.a,
            "topic": r._7.strip(),
            "section": r.section,
            "year": int(r.year) if r.year == r.year else None,
        }, ensure_ascii=False) + "\n")

print(f"unique {len(df)} -> wrote {len(final)}")
print(final.section.value_counts().to_string())
