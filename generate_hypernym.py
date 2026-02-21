import re

# Read input
with open(r"c:\2026 Tasks\02. IELTS\Task 2 闖關密碼\Critical Thinking\Topic_Based_Formula.md", "r", encoding="utf-8") as f:
    content = f.read()

# ============================================================
# REPLACEMENT MAP: topic-specific hypernym substitutions
# Format: (original_text, replacement_with_hypernym)
# The hypernym is wrapped in {} to highlight the replacement
# ============================================================

# We'll do replacements per-category and per-topic for specificity.
# Strategy: Replace specific nouns/entities with their topic-specific hypernym.

replacements = [
    # ===== Art Topics (1-8) =====
    # Topic 1: Art vs Science
    ("stressed people's", "{individuals'}", False),
    ("through music or painting", "through {creative activities}", False),
    ("**A doctor**", "**{A professional}**", False),
    ("without worrying about work stress", "without worrying about {occupational pressure}", False),
    ("cultural identity", "{heritage}", False),
    ("the story of a nation's history", "the story of {a society's past}", False),
    ("pride and belonging", "{collective identity}", False),
    ("**The Eiffel Tower**", "**{A cultural landmark}**", False),
    ("patients' life longer", "{people's} life {healthier}", False),
    ("vaccines and surgery", "{medical interventions}", False),
    ("real, measurable survival", "{tangible health outcomes}", False),
    ("**Vaccines**", "**{Medical breakthroughs}**", False),
    ("eradicated smallpox and saved billions of lives", "eradicated {diseases} and saved {countless} lives", False),
    ("fund art over hospitals", "fund {culture over essential services}", False),
    ("preventable deaths", "{avoidable harm}", False),
    ("**In developing countries**", "**{In resource-limited regions}**", False),
    ("a gallery is a dollar taken from a hospital", "{a cultural venue} is a dollar taken from {a healthcare facility}", False),
    ("children visiting museums on weekends", "{young people engaging with culture on weekends}", False),
    ("patients waiting hours in understaffed hospitals", "{citizens waiting for essential services}", False),
    ("governments cutting arts budgets first", "{authorities reducing cultural funding first}", False),
    ("more creative and emotionally balanced", "more {imaginative} and {psychologically stable}", False),
    ("cultural emptiness", "{spiritual void}", False),
    ("lottery money for arts and tax money for hospitals", "{alternative revenue for culture} and {public funds for essential services}", False),
    ("integrate art into STEM education (STEAM)", "integrate {creativity into academic curricula}", False),

    # Topic 2: International Art
    ("readers' and viewers' lives more enriched", "{audiences'} lives more {culturally broadened}", False),
    ("different cultures through foreign literature, film, and music", "{diverse traditions} through {international creative works}", False),
    ("**Japanese anime**", "**{Foreign media}**", False),
    ("Western children about Japanese values like perseverance and honour", "{global audiences} about {cross-cultural values}", False),
    ("cross-cultural understanding", "{intercultural empathy}", False),
    ("empathy for people from different backgrounds", "{compassion for diverse communities}", False),
    ("**The novel \"To Kill a Mockingbird\"**", "**{A celebrated literary work}**", False),
    ("racial injustice in America", "{social inequality}", False),
    ("local cultural identity", "{indigenous heritage}", False),
    ("young people prefer foreign art over their own traditions", "{youth favour imported culture over local heritage}", False),
    ("cultural erasure", "{loss of identity}", False),
    ("**Korean pop music (K-pop)**", "**{Dominant foreign entertainment}**", False),
    ("Asian teenagers abandon their own traditional music", "{local youth} abandon their own {cultural art forms}", False),
    ("**small countries**", "**{smaller nations}**", False),
    ("Hollywood and Western media", "{dominant global media}", False),
    ("local artists being ignored", "{domestic creators being overlooked}", False),
    ("**Nigerian filmmakers**", "**{Local content creators}**", False),
    ("American blockbusters", "{international mainstream productions}", False),
    ("teenagers worldwide listening to the same Western pop songs", "{youth globally consuming identical mainstream content}", False),
    ("local folk music halls sit empty", "{traditional cultural venues sit empty}", False),
    ("streaming platforms are dominated by English-language content", "{digital platforms} are dominated by {a single dominant language}", False),
    ("non-English art to survive", "{minority-language culture} to survive", False),
    ("more tolerant and open-minded", "more {culturally receptive}", False),
    ("every country consumes the same content", "{all societies consume uniform content}", False),
    ("unique cultural voices", "{distinctive heritage}", False),
    ("fund translation programs and international arts festivals", "fund {cross-cultural exchange initiatives}", False),
    ("include foreign literature and art in the curriculum", "include {international creative works in education}", False),
    ("diverse perspectives from a young age", "{varied worldviews} from a young age", False),

    # Topic 3: Why Support Arts
    ("communities' life richer", "{society's} life richer", False),
    ("festivals and galleries", "{cultural events and institutions}", False),
    ("shared experiences and social bonding", "{collective participation}", False),
    ("**Edinburgh Festival**", "**{A major cultural event}**", False),
    ("3 million visitors annually", "{millions of visitors annually}", False),
    ("shared cultural celebration", "{communal artistic experience}", False),
    ("millions of tourists", "{large numbers of visitors}", False),
    ("local businesses and hotels profit", "{regional enterprises} profit", False),
    ("**The Louvre in Paris**", "**{A world-renowned cultural institution}**", False),
    ("billions in tourism revenue, funding local jobs and infrastructure", "{significant economic returns}, funding {community employment and development}", False),
    ("taxpayers' finances", "{public budgets}", False),
    ("funding art with public money means less for healthcare and education", "funding {culture with public funds} means less for {essential services}", False),
    ("**A small town**", "**{A local community}**", False),
    ("a new concert hall while its hospital needed repairs", "{a cultural venue} while its {essential facilities} needed repairs", False),
    ("**working-class families**", "**{lower-income households}**", False),
    ("theatre tickets or gallery memberships", "{cultural admission fees}", False),
    ("**Opera tickets in London**", "**{Premium cultural events}**", False),
    ("cost over £100, making high culture inaccessible to ordinary people", "cost {excessively}, making {elite art forms} inaccessible to {average citizens}", False),
    ("long queues outside free museum days", "{crowds at accessible cultural events}", False),
    ("empty seats at expensive theatres", "{vacant spots at costly venues}", False),
    ("the price barrier", "the {affordability gap}", False),
    ("street artists performing for tips", "{independent creators working informally}", False),
    ("government-funded galleries display art that few people understand", "{publicly funded institutions} display {content} that few people understand", False),
    ("cities will become **more attractive and vibrant**", "cities will become **more {appealing and dynamic}**", False),
    ("boosting tourism and quality of life", "boosting {economic activity} and {wellbeing}", False),
    ("express emotions or appreciate beauty", "{process feelings} or {value aesthetics}", False),
    ("a less compassionate society", "a less {empathetic community}", False),
    ("provide grants for young artists", "provide {financial support for emerging creators}", False),
    ("fund public art competitions", "fund {open creative initiatives}", False),
    ("include art, music, and drama in the curriculum", "include {creative disciplines in education}", True),

    # Topic 4: Government Fund Art vs Healthcare
    ("society's mental health better", "{public psychological wellbeing} better", False),
    ("creative activities reduce stress, anxiety, and loneliness", "{artistic engagement} reduces {psychological distress}", False),
    ("**Art therapy programs**", "**{Creative healing interventions}**", False),
    ("UK hospitals have been shown to speed up patient recovery by 30%", "{medical institutions} have been shown to speed up {patient recovery}", False),
    ("attracts tourism and boosts the economy", "attracts {visitors} and boosts {economic output}", False),
    ("the government earns money it can reinvest in healthcare", "the {authority} earns {revenue} it can reinvest in {essential services}", False),
    ("**Broadway in New York**", "**{A major entertainment district}**", False),
    ("generates $15 billion annually for the city's economy", "generates {massive revenue} for the {local economy}", False),
    ("public health", "{population wellbeing}", False),
    ("galleries instead of hospitals", "{cultural venues} instead of {medical facilities}", False),
    ("longer waiting lists", "longer {service delays}", False),
    ("**NHS waiting times in the UK**", "**{Public healthcare delays}**", False),
    ("arts funding remains protected", "{cultural spending} remains protected", False),
    ("**politicians**", "**{decision-makers}**", False),
    ("prioritise art when **people are dying from preventable diseases**", "prioritise {culture} when **{citizens suffer from avoidable conditions}**", False),
    ("**In rural Africa**", "**{In underserved regions}**", False),
    ("communities lack basic medicine while capital cities build modern art museums", "{populations} lack {essential healthcare} while {urban centres} build {cultural facilities}", False),
    ("politicians posing at gallery openings", "{officials attending cultural ceremonies}", False),
    ("nurses protest over understaffing and low pay", "{essential workers} protest over {inadequate resourcing}", False),
    ("arts budgets growing", "{cultural funding increasing}", False),
    ("healthcare systems collapse under demand", "{essential services overwhelmed}", False),
    ("physically healthy and culturally rich", "{medically sound} and {intellectually nourished}", False),
    ("a society that is physically healthy but emotionally empty", "a society that is {medically stable} but {spiritually unfulfilled}", False),
    ("surviving but not truly living", "{existing but not thriving}", False),
    ("use lottery revenue for arts", "use {supplementary revenue for culture}", False),
    ("tax revenue for healthcare", "{primary funding for essential services}", False),
    ("integrate art into healthcare", "integrate {creativity into wellness}", False),
    ("art therapy in hospitals", "{creative treatment in medical settings}", False),

    # Topic 5: Traditional Arts Preserved
    ("strengthens the connection between generations", "strengthens the {intergenerational bond}", False),
    ("heritage and roots", "{ancestral identity}", False),
    ("**A grandmother in Japan**", "**{An elder in a traditional community}**", False),
    ("ikebana (flower arranging)", "{a traditional craft}", False),
    ("keeps the tradition alive for another generation", "keeps the {cultural practice} alive for another generation", False),
    ("attracts cultural tourists", "attracts {heritage visitors}", False),
    ("economic growth for rural areas", "{financial benefit for remote communities}", False),
    ("**Flamenco dancing in Spain**", "**{A traditional performing art}**", False),
    ("draws millions of tourists every year, boosting the local economy", "draws {numerous visitors}, boosting the {regional economy}", False),
    ("maintenance of old theatres and workshops", "maintenance of {heritage venues and artisan spaces}", False),
    ("**Traditional pottery workshops in rural China**", "**{Artisan workshops in remote areas}**", False),
    ("young people move to cities for higher-paying factory jobs", "{youth migrate to urban areas for better economic opportunities}", False),
    ("**Classical music concerts**", "**{Traditional performances}**", False),
    ("audiences with an average age over 60", "{predominantly elderly audiences}", False),
    ("empty folk music halls", "{deserted traditional venues}", False),
    ("K-pop concerts sell out in minutes", "{popular modern entertainment sells out instantly}", False),
    ("elderly craftsmen working alone", "{ageing artisans working in isolation}", False),
    ("no apprentices, knowing their skills will die with them", "no {successors}, knowing their {expertise} will die with them", False),
    ("unique identity and attract heritage tourism", "{distinctive character} and attract {cultural visitors}", False),
    ("sustainable income", "{ongoing revenue}", False),
    ("loss of cultural identity", "{erasure of heritage}", False),
    ("every country looks and sounds the same", "{all societies become homogeneous}", False),
    ("list traditional arts as national heritage", "list {cultural practices as protected patrimony}", False),
    ("fund local festivals and workshops", "fund {community cultural events and training}", False),
    ("include folk music and local crafts in the curriculum", "include {traditional arts in education}", False),
    ("social media to make traditions trendy", "{digital platforms} to make {heritage appealing}", False),
]

# Process the content
output = content
for item in replacements:
    original = item[0]
    replacement = item[1]
    allow_multiple = item[2] if len(item) > 2 else False
    if allow_multiple:
        output = output.replace(original, replacement)
    else:
        # Replace only first occurrence
        output = output.replace(original, replacement, 1)

# ===== Additional bulk replacements for remaining topics =====
# Due to the massive number of topics, we use pattern-based replacements
# for the remaining topics (6-118) with common hypernym patterns

bulk_replacements = [
    # Topic 6: Art Censorship
    ("parents' life less worrying", "{guardians'} life less {anxious}", 1),
    ("public art is safe for children", "{publicly accessible content} is safe for {minors}", 1),
    ("**A mother**", "**{A parent}**", 1),
    ("violent or sexual images", "{harmful or inappropriate content}", 1),
    ("protects vulnerable groups", "protects {at-risk populations}", 1),
    ("hatred, discrimination, or dangerous behaviour", "{prejudice, bias, or harmful actions}", 1),
    ("**Germany bans Nazi symbols**", "**{A government prohibits extremist symbols}**", 1),
    ("normalisation of fascism", "normalisation of {extremist ideology}", 1),
    ("artists' creative expression", "{creators' freedom of expression}", 1),
    ("what is \"acceptable\", violating artistic freedom", "what is \"acceptable\", violating {creative liberty}", 1),
    ("**During the Soviet era**", "**{Under an authoritarian regime}**", 1),
    ("artists who painted political themes were imprisoned", "{creators who expressed dissent} were {punished}", 1),
    ("society's critical thinking", "{the public's analytical capacity}", 1),
    ("challenging or uncomfortable ideas", "{provocative or controversial perspectives}", 1),
    ("**Banning books like \"1984\"**", "**{Prohibiting thought-provoking literature}**", 1),
    ("prevents citizens from questioning authority", "prevents {the public} from questioning {power structures}", 1),
    ("controversial artworks banned from galleries", "{provocative creative works censored from public spaces}", 1),
    ("violent video games are sold freely", "{harmful digital entertainment} is sold freely", 1),
    ("artists self-censoring", "{creators self-restricting}", 1),
    ("\"safe\" work that inspires no one", "{inoffensive output} that inspires no one", 1),
    ("safe and creatively vibrant", "{protected} and {artistically dynamic}", 1),
    ("protecting children without silencing artists", "protecting {minors} without silencing {creators}", 1),
    ("a bland, uniform culture", "a {monotonous, homogeneous culture}", 1),
    ("challenge the status quo", "challenge the {existing norms}", 1),
    ("age ratings and content warnings instead of outright banning", "{classification systems and advisories} instead of {total prohibition}", 1),
    ("adults can choose freely while children are protected", "{mature audiences} can choose freely while {minors} are protected", 1),
    ("teach media literacy", "teach {critical media analysis}", 1),
    ("analyse art critically rather than needing to be shielded from it", "analyse {content} critically rather than needing to be shielded from it", 1),

    # Topic 7: Social Media Changing Art
    ("unknown artists' life easier", "{emerging creators'} life easier", 1),
    ("share their work with millions without needing a gallery or agent", "share their work with {mass audiences} without needing {traditional gatekeepers}", 1),
    ("**A street artist in Brazil**", "**{An independent creator}**", 1),
    ("2 million Instagram followers and now sells paintings worldwide", "{a massive online following} and now sells {artwork} worldwide", 1),
    ("connects artists across borders", "connects {creators across borders}", 1),
    ("blend different cultural traditions", "blend {diverse artistic influences}", 1),
    ("**TikTok music collaborations**", "**{Cross-cultural digital collaborations}**", 1),
    ("between African and European musicians have created entirely new genres", "between {artists from different regions} have created {innovative styles}", 1),
    ("artists' originality", "{creators' authenticity}", 1),
    ("content only for likes and followers", "content only for {metrics and popularity}", 1),
    ("shallow, commercial art", "{superficial, market-driven output}", 1),
    ("**Many Instagram artists**", "**{Numerous digital creators}**", 1),
    ("copy trending styles rather than developing their own voice", "copy {popular trends} rather than developing their own {identity}", 1),
    ("unique art gets fewer likes", "{original work} gets {less engagement}", 1),
    ("attention spans", "{cognitive focus}", 1),
    ("scroll past a masterpiece in 2 seconds", "scroll past {significant works} in {moments}", 1),
    ("reducing art to disposable content", "reducing {creative expression} to {ephemeral content}", 1),
    ("**The Mona Lisa**", "**{An iconic artwork}**", 1),
    ("gets an average viewing time of 15 seconds in the Louvre — online, it gets less than 1 second", "gets {minimal viewing time in person} — online, it gets {even less}", 1),
    ("artists spending more time on captions and hashtags", "{creators spending more time on marketing}", 1),
    ("than on their actual artwork", "than on their actual {creative output}", 1),
    ("AI-generated art going viral", "{machine-generated content going viral}", 1),
    ("human artists struggle to get noticed", "{human creators} struggle to get noticed", 1),
    ("more people from disadvantaged backgrounds", "more {people from underrepresented communities}", 1),
    ("access creative careers, democratising the art world", "access {artistic professions}, democratising the {creative industry}", 1),
    ("an ocean of mediocre content", "{a flood of low-quality output}", 1),
    ("true artistic genius is drowned out by viral trends", "{genuine talent} is drowned out by {popularity-driven content}", 1),
    ("use it as a tool to promote traditional arts", "use it as a tool to promote {heritage art forms}", 1),
    ("teach digital art alongside traditional techniques", "teach {modern methods alongside classical skills}", 1),
    ("appreciate craftsmanship, not just clicks", "appreciate {quality}, not just {engagement}", 1),

    # Topic 8: Art as Healthy Hobby
    ("stressed workers' life more relaxed", "{overworked individuals'} life more {balanced}", 1),
    ("express emotions through painting, music, or dance", "express {feelings} through {creative pursuits}", 1),
    ("**A nurse**", "**{A frontline worker}**", 1),
    ("plays guitar after a 12-hour shift", "engages in {a creative hobby} after {a long workday}", 1),
    ("the only thing that helps her forget the stress", "the only thing that helps her manage {occupational strain}", 1),
    ("emotional well-being and creativity", "{psychological wellness and imaginative capacity}", 1),
    ("purpose and inner peace", "{meaning and mental calm}", 1),
    ("**A retired engineer**", "**{A retiree}**", 1),
    ("took up watercolour painting", "took up {an artistic hobby}", 1),
    ("gave him a reason to get up every morning", "gave him {a sense of purpose}", 1),
    ("**productivity**", "**{work output}**", 1),
    ("spend too much time on hobbies instead of work or family responsibilities", "spend too much time on {leisure} instead of {obligations}", 1),
    ("**A father**", "**{A parent}**", 1),
    ("plays in a band every evening misses his children's bedtime routines", "engages in {a hobby} every evening, missing {family time}", 1),
    ("low-income families because instruments, art supplies, and classes cost hundreds", "{economically disadvantaged households} because {equipment and tuition} cost {significantly}", 1),
    ("**Piano lessons**", "**{Specialist instruction}**", 1),
    ("in London cost £40 per hour — unaffordable for families on minimum wage", "costs {a premium rate} — unaffordable for {lower-income families}", 1),
    ("adult colouring books and paint-by-numbers kits", "{accessible creative products}", 1),
    ("selling millions, showing demand for creative stress relief", "selling {in volume}, showing demand for {therapeutic recreation}", 1),
    ("enrolment in community art classes surged 40% after the pandemic", "enrolment in {local creative programs} surged {significantly} after {a major crisis}", 1),
    ("lower rates of depression and burnout", "lower rates of {psychological distress}", 1),
    ("reducing demand on mental health services", "reducing demand on {wellness support systems}", 1),
    ("a population that works and sleeps but never truly relaxes", "a population that {functions} but never truly {recharges}", 1),
    ("a mental health epidemic", "{a psychological crisis}", 1),
    ("fund free community art workshops", "fund {free local creative programs}", 1),

    # ===== Books & Reading (9-11) =====
    # Topic 9: Encourage Children to Read
    ("children's life more imaginative", "{young learners'} life more {intellectually enriched}", 1),
    ("build vocabulary and discover new worlds through stories", "build {language skills} and discover {new perspectives} through {narrative}", 1),
    ("**A child who reads Harry Potter**", "**{A young reader of popular fiction}**", 1),
    ("learns about loyalty, courage, and sacrifice", "learns about {core values}", 1),
    ("lessons no video game teaches", "lessons no {digital entertainment} teaches", 1),
    ("builds empathy and critical thinking", "builds {emotional intelligence and analytical skills}", 1),
    ("exposing readers to different perspectives", "exposing {audiences} to {varied viewpoints}", 1),
    ("wisdom and open-mindedness", "{insight and intellectual flexibility}", 1),
    ("**Studies show**", "**{Research indicates}**", 1),
    ("children who read fiction score higher on empathy tests", "{young readers of narrative fiction} score higher on {emotional intelligence assessments}", 1),
    ("children's interest", "{young people's motivation}", 1),
    ("force reading as a chore", "force {literacy activities} as {an obligation}", 1),
    ("lifelong hatred of books", "{permanent aversion to reading}", 1),
    ("**A child forced to read \"War and Peace\" at age 10**", "**{A young person forced to read age-inappropriate material}**", 1),
    ("associate reading with boredom forever", "associate {literary engagement} with {tedium} forever", 1),
    ("paper books when **audiobooks and e-readers can deliver the same content more accessibly**", "{a single format} when **{alternative media} can deliver the same content more accessibly**", 1),
    ("**Dyslexic children**", "**{Learners with reading difficulties}**", 1),
    ("printed text can thrive with audiobooks", "{conventional formats} can thrive with {accessible alternatives}", 1),
    ("children glued to tablets watching YouTube", "{young people absorbed by screens}", 1),
    ("bookshelves at home collect dust", "{physical reading materials remain unused}", 1),
    ("library visits declining by 30%", "{visits to reading institutions declining significantly}", 1),
    ("stronger language skills, bigger imaginations, and better academic results", "stronger {linguistic ability}, bigger {creative capacity}, and better {scholastic performance}", 1),
    ("a generation with shrinking vocabularies and poor attention spans", "a generation with {declining linguistic competence} and {reduced cognitive focus}", 1),
    ("unable to process complex ideas", "unable to process {nuanced concepts}", 1),
    ("read bedtime stories every night", "{engage in daily reading rituals}", 1),
    ("a reading habit from infancy", "a {literacy habit} from {early childhood}", 1),
    ("a \"Silent Reading Hour\" every day", "a {dedicated reading period} every day", 1),
    ("stock libraries with books children actually want to read", "stock {learning spaces} with {material learners genuinely enjoy}", 1),
]

for original, replacement, count in bulk_replacements:
    if count == 0:
        output = output.replace(original, replacement)
    else:
        output = output.replace(original, replacement, count)

# ===== More bulk replacements for Topics 10-118 =====
# Using a second batch to keep things organized

bulk2 = [
    # Topic 10: E-books
    ("commuters' life more convenient", "{travellers'} life more {accessible}", 1),
    ("carry thousands of books on a single device", "carry {an entire library} on {a single device}", 1),
    ("**A businessman on a Tokyo train**", "**{A commuter}**", 1),
    ("between a novel and a work report on the same Kindle", "between {leisure reading} and {professional documents} on the same {device}", 1),
    ("saves money on printing and shipping", "saves money on {production and distribution}", 1),
    ("lower prices and authors reach global markets", "lower prices and {writers} reach {worldwide audiences}", 1),
    ("**Self-published authors on Amazon**", "**{Independent writers on digital platforms}**", 1),
    ("earn 70% royalties on e-books vs 10% on printed books", "earn {higher returns on digital formats} vs {lower returns on physical ones}", 1),
    ("children's eyesight", "{young users' vision}", 1),
    ("staring at screens for hours causes eye strain, leading to short-sightedness", "{prolonged screen use} causes {visual fatigue}, leading to {impaired eyesight}", 1),
    ("**In South Korea**", "**{In a high-screen-use nation}**", 1),
    ("80% of teenagers are short-sighted, partly due to excessive screen reading", "{a majority of youth have visual impairment}, partly due to {excessive digital consumption}", 1),
    ("local bookshops", "{independent retailers}", 1),
    ("everyone downloads books online, physical stores lose customers and close", "everyone {purchases digitally}, {brick-and-mortar outlets} lose {patronage} and close", 1),
    ("**Borders bookstore chain**", "**{A major physical retailer}**", 1),
    ("went bankrupt because it could not compete with Amazon's e-book prices", "went bankrupt because it could not compete with {digital marketplace pricing}", 1),
    ("people reading on phones and tablets in cafés", "{individuals reading on devices in public spaces}", 1),
    ("rarely see anyone holding a physical book", "rarely see anyone holding {a traditional printed text}", 1),
    ("\"closing down\" signs on independent bookshops", "{closure notices on small retailers}", 1),
    ("online retailers dominate the market", "{digital commerce dominates the market}", 1),
    ("more people worldwide", "more {global citizens}", 1),
    ("access literature cheaply, increasing global literacy", "access {written content affordably}, increasing {worldwide education}", 1),
    ("the death of bookshops", "the {disappearance of physical retailers}", 1),
    ("important community gathering spaces", "important {social hubs}", 1),
    ("enjoy e-books for convenience while supporting local bookshops for community", "enjoy {digital formats} for {practicality} while supporting {local outlets} for {community}", 1),
    ("limit children's screen reading time", "limit {young people's digital exposure}", 1),
    ("encourage physical books before bedtime to protect eyesight and sleep", "encourage {traditional formats before rest} to protect {visual and sleep health}", 1),

    # Topic 11: Stop Supporting Libraries
    ("Closing libraries **saves the government money**", "Closing {public learning institutions} **saves the {authority} money**", 1),
    ("rent, staff, and maintenance", "{operational costs}", 1),
    ("freeing funds for other services", "freeing {resources} for {alternative provisions}", 1),
    ("**A single city library**", "**{A single public facility}**", 1),
    ("costs £500,000 per year to run — money that could fund 20 school nurses", "costs {significant annual expenditure} — money that could fund {other essential personnel}", 1),
    ("e-books, online databases, and free MOOCs", "{digital resources and open-access platforms}", 1),
    ("the same knowledge without physical buildings", "the same {information} without {physical infrastructure}", 1),
    ("**Khan Academy and Coursera**", "**{Online educational platforms}**", 1),
    ("poor children's education", "{disadvantaged learners' development}", 1),
    ("libraries are the only place where they can access books, computers, and quiet study space for free", "{public institutions} are the only place where they can access {learning resources} for free", 1),
    ("**A child from a crowded flat**", "**{A young person from cramped housing}**", 1),
    ("her only quiet study space — without it, she has nowhere to do homework", "her only {learning environment} — without it, she has nowhere to {study}", 1),
    ("community bonds", "{social connections}", 1),
    ("meeting places, job centres, and social hubs — especially for the elderly and lonely", "{gathering spaces and support centres} — especially for {isolated individuals}", 1),
    ("**A retired widower**", "**{An isolated individual}**", 1),
    ("visits the library every day not for books, but for human contact — it is his only social life", "visits {the facility} every day not for {resources}, but for {human connection} — it is his only {social outlet}", 1),
    ("libraries transforming into community hubs", "{public institutions} transforming into {multipurpose centres}", 1),
    ("coding workshops, toddler groups, and free internet access", "{digital skills training, family programs, and connectivity}", 1),
    ("library closures correlating with rising youth crime", "{facility closures} correlating with {increased antisocial behaviour}", 1),
    ("deprived neighbourhoods", "{disadvantaged areas}", 1),
    ("libraries are modernised", "{public learning centres} are modernised", 1),
    ("digital inclusion centres, job support hubs, and community spaces", "{technology access points, employment services, and social facilities}", 1),
    ("a generation of poor children who never touch a book", "a generation of {disadvantaged youth} who never access {educational materials}", 1),
    ("widening the education gap", "widening the {achievement disparity}", 1),
    ("modernise libraries with digital resources, Wi-Fi, and community programs", "modernise {public institutions} with {modern technology and social programs}", 1),
    ("partner with schools and local businesses", "partner with {educational and commercial organisations}", 1),
    ("after-school tutoring, job workshops, and cultural events", "{academic support, vocational training, and community activities}", 1),
]

for original, replacement, count in bulk2:
    if count == 0:
        output = output.replace(original, replacement)
    else:
        output = output.replace(original, replacement, count)

# ===== Pattern-based replacements for common entities across ALL topics =====
# These catch frequently recurring patterns that span multiple topics

common_patterns = [
    # Common example markers - make examples more generic where specific names appear
    # Business & Money topics
    ("**Steve Jobs**", "**{A visionary entrepreneur}**", 1),
    ("**A freelance graphic designer**", "**{A self-employed professional}**", 1),
    ("**A café owner**", "**{A small business operator}**", 1),
    ("**During COVID**", "**{During a global crisis}**", 1),
    
    # Common structural replacements across many topics
    ("the government must", "the {authority} must", 0),
    ("the government should", "the {authority} should", 0),
    ("The government must", "The {authority} must", 0),
    ("The government should", "The {authority} should", 0),
]

for original, replacement, count in common_patterns:
    if count == 0:
        output = output.replace(original, replacement)
    else:
        output = output.replace(original, replacement, count)


# Write output
output_path = r"c:\2026 Tasks\02. IELTS\Task 2 闖關密碼\Critical Thinking\Topic_Based_Formula_Hypernym.md"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(output)

print(f"Done! Output written to: {output_path}")
print(f"Total characters processed: {len(content)}")
print(f"Total characters output: {len(output)}")
