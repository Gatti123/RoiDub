"""
Market data for Yield Desk areas (apartments).
Run:  python3 scripts/build_area_data.py
Writes: supabase/seed_areas.sql  and  data/yield-desk-area-data.xlsx

Sources (collected 2 Nov 2026):
  PM  = Property Monitor, DLD-registered secondary sales and rents, 2026 to date (to 2 Apr 2026),
        via White & Co. market report (whiteandcogroup.com/wp-content/uploads/2026/05/Downtown-2.pdf)
  BAY = Bayut Dubai Rental Market Report H1 2026 (asking rents), Bayut Sales Market Report H1 2026,
        Bayut Q3 2026 market report (asking prices), Bayut price index pages
  PS  = Propsearch.ae community guides (drive times, metro, schools, amenities), checked 2 Nov 2026
  SC  = Service charges: DLD / Mollak RERA-approved budgets 2026 (community medians where published),
        otherwise RERA index community averages from 2026 market guides; "est." = estimate
"""
import json, os

# Default growth assumption = observed change, clamped to this band (conservative for a cooling market)
GROWTH_MIN, GROWTH_MAX = -2.0, 3.0

A = []  # areas
def area(id, en, ru, psf_prev, psf, rents, sc, metro, hl_en, hl_ru, src_price, src_rent, src_sc, rent_est=(), psf_note=""):
    A.append(dict(id=id, name_en=en, name_ru=ru, psf_prev=psf_prev, psf=psf, rents=rents, sc=sc, metro=metro,
                  hl_en=hl_en, hl_ru=hl_ru, src_price=src_price, src_rent=src_rent, src_sc=src_sc,
                  rent_est=set(rent_est), psf_note=psf_note))

PM = "Property Monitor (DLD secondary sales, 2026 YTD to Apr)"
PMR = "Property Monitor (DLD registered rents, 2026 YTD to Apr)"

area("downtown", "Downtown Dubai", "Даунтаун Дубай", 2689, 2674, [89708, 128913, 207941, 311958], 22, True,
     ["Burj Khalifa/Dubai Mall metro station (Red Line), walkway from the mall",
      "By car: DXB airport ~33 min, Palm Jumeirah ~21 min, JBR ~26 min",
      "Dubai Mall (1,200 shops), Dubai Fountain, Dubai Opera, 11-hectare Burj Park",
      "Schools: Citizens School, City Walk (1.6 km); 12 nearby schools rated Very Good or Outstanding"],
     ["Станция метро Burj Khalifa/Dubai Mall (красная ветка), переход из молла",
      "На машине: аэропорт DXB ~33 мин, Палм ~21 мин, JBR ~26 мин",
      "Dubai Mall (1 200 магазинов), Dubai Fountain, Dubai Opera, парк Burj Park 11 га",
      "Школы: Citizens School в City Walk (1,6 км); рядом 12 школ с рейтингом Very Good или Outstanding"],
     PM, PMR, "RERA index range 17–40, typical 18–25")
area("business-bay", "Business Bay", "Бизнес-Бэй", 1893, 2023, [76784, 104246, 152054, 207072], 15, True,
     ["Business Bay metro station (Red Line); water buses on Dubai Canal",
      "By car: Dubai Mall ~9 min, DXB airport ~32 min, Palm Jumeirah ~21 min, JBR ~25 min",
      "Burj Khalifa about 1.5 km away; Downtown within walking distance",
      "1,000+ shops, cafés and restaurants inside the community"],
     ["Станция метро Business Bay (красная ветка); водные автобусы по Dubai Canal",
      "На машине: Dubai Mall ~9 мин, аэропорт DXB ~32 мин, Палм ~21 мин, JBR ~25 мин",
      "Бурдж-Халифа примерно в 1,5 км, до Даунтауна можно дойти пешком",
      "Более 1 000 магазинов, кафе и ресторанов в районе"],
     PM, PMR, "RERA index community average ~14.75")
area("dubai-marina", "Dubai Marina", "Дубай Марина", 1930, 2021, [77055, 104281, 157320, 239411], 16, True,
     ["Two Red Line metro stations plus Dubai Tram: a car is optional",
      "By car: JBR ~5 min, Palm Jumeirah ~12 min, Dubai Mall ~20 min, DXB airport ~45 min",
      "Marina Walk promenade, Dubai Marina Mall with cinema, Marina Beach 0.6 km",
      "Schools: Emirates International School Meadows (2.4 km); 8 nearby schools rated Very Good or Outstanding"],
     ["Две станции красной ветки метро и трамвай: можно жить без машины",
      "На машине: JBR ~5 мин, Палм ~12 мин, Dubai Mall ~20 мин, аэропорт DXB ~45 мин",
      "Набережная Marina Walk, Dubai Marina Mall с кинотеатром, пляж в 600 м",
      "Школы: Emirates International School Meadows (2,4 км); рядом 8 школ с рейтингом Very Good или Outstanding"],
     PM, PMR, "RERA index community average ~16.1")
area("jbr", "Jumeirah Beach Residence (JBR)", "Джумейра Бич Резиденс (JBR)", 2161, 2367, [104836, 118743, 171410, 257135], 16, False,
     ["Direct beach access and The Walk", "Dubai Tram; Marina metro stations nearby", "Strong holiday-home demand"],
     ["Прямой выход к пляжу и The Walk", "Трамвай, станции метро Марины рядом", "Высокий спрос на краткосрочную аренду"],
     PM, PMR, "RERA index ~15.4")
area("palm-jumeirah", "Palm Jumeirah", "Палм-Джумейра", 3023, 3250, [106213, 143404, 336446, 410269], 18, False,
     ["No metro: Palm Monorail along the trunk links to the tram and metro at Dubai Marina; water taxis",
      "By car: JBR ~19 min, Dubai Mall ~24 min, DXB airport ~46 min",
      "Beaches incl. Palm West Beach; Nakheel Mall, Golden Mile Galleria, Atlantis",
      "Apartments on the trunk (Shoreline, Golden Mile), villas on the fronds"],
     ["Метро нет: монорельс вдоль ствола острова до трамвая и метро в Марине; водное такси",
      "На машине: JBR ~19 мин, Dubai Mall ~24 мин, аэропорт DXB ~46 мин",
      "Пляжи, в том числе Palm West Beach; Nakheel Mall, Golden Mile Galleria, Atlantis",
      "Квартиры на «стволе» острова (Shoreline, Golden Mile), виллы на «ветвях»"],
     PM, PMR, "standard 11–15, branded 20–30+; est. blend")
area("emaar-beachfront", "Emaar Beachfront", "Эмаар Бичфронт", 3646, 3452, [107000, 152801, 239498, 377452], 27, False,
     ["Private beach between Dubai Marina and Palm", "New Emaar towers", "No metro station inside the community"],
     ["Частный пляж между Мариной и Палмой", "Новые башни Emaar", "Метро внутри района нет"],
     PM, PMR, "2026 guides range 22–32", rent_est=[0])
area("jlt", "Jumeirah Lake Towers (JLT)", "Джумейра Лейк Тауэрс (JLT)", 1471, 1515, [66425, 87780, 131686, 171420], 14, True,
     ["Next to Dubai Marina at lower prices", "Two Red Line metro stations", "DMCC free zone offices in the community"],
     ["Рядом с Мариной, но дешевле", "Две станции красной ветки метро", "Офисы свободной зоны DMCC в районе"],
     PM, PMR, "RERA index ~13.65")
area("the-greens", "The Greens", "Зе Гринс", 1646, 1806, [63563, 99426, 146809, 206839], 14, False,
     ["Low-rise Emaar community with green spaces", "Next to Dubai Internet City and Media City", "Established tenant base"],
     ["Малоэтажный район Emaar с зеленью", "Рядом Dubai Internet City и Media City", "Устоявшийся спрос арендаторов"],
     PM, PMR, "est. (2025 guide ~13)")
area("the-views", "The Views", "Зе Вьюз", 1971, 2207, [76250, 112461, 169944, 248750], 16, False,
     ["Emaar towers overlooking Emirates Golf Club", "Next to The Greens", "Mid-to-upper segment"],
     ["Башни Emaar с видом на Emirates Golf Club", "Рядом с The Greens", "Средний и выше среднего сегмент"],
     PM, PMR, "est.")
area("jvc", "Jumeirah Village Circle (JVC)", "Джумейра Вилладж Серкл (JVC)", 1266, 1313, [54853, 78339, 105611, 156020], 13, False,
     ["No metro: nearest station Mall of the Emirates (Red Line), feeder bus J01",
      "By car: Dubai Mall ~21 min, Dubai Marina ~20 min, DXB airport ~38 min",
      "Schools: JSS International (1 km), Sunmarke (1.8 km); 14 nearby schools rated Very Good or Outstanding",
      "Circle Mall with cinema, 33 landscaped parks, Miracle Garden 3.7 km"],
     ["Метро в районе нет: ближайшая станция Mall of the Emirates (красная ветка), автобус J01",
      "На машине: Dubai Mall ~21 мин, Дубай Марина ~20 мин, аэропорт DXB ~38 мин",
      "Школы: JSS International (1 км), Sunmarke (1,8 км); рядом 14 школ с рейтингом Very Good или Outstanding",
      "Circle Mall с кинотеатром, 33 парка, Miracle Garden в 3,7 км"],
     PM, PMR, "2026 guides range 10–22")
area("arjan", "Arjan", "Арджан", 1290, 1401, [52579, 74132, 106474, 163095], 15.7, False,
     ["Near Miracle Garden and Al Barsha South", "Many new mid-market towers", "Car-dependent: no metro station"],
     ["Рядом Miracle Garden и Al Barsha South", "Много новых башен среднего сегмента", "Нужен автомобиль: метро нет"],
     PM, PMR, "DLD/Mollak 2026 median 15.67")
area("al-furjan", "Al Furjan", "Аль-Фурджан", 1278, 1289, [54438, 76078, 112816, 137884], 14, True,
     ["Family community with apartments and townhouses", "Al Furjan metro station (Route 2020)", "Close to Expo City and Jebel Ali"],
     ["Семейный район: квартиры и таунхаусы", "Станция метро Al Furjan (Route 2020)", "Рядом Expo City и Джебель-Али"],
     PM, PMR, "DLD/Mollak 2026 median 13.91")
area("dubai-hills", "Dubai Hills Estate", "Дубай Хиллс Эстейт", 2387, 2464, [76338, 107525, 167375, 284950], 18.5, False,
     ["No metro station today: a car is needed",
      "By car: Dubai Mall ~13 min, DXB airport ~18 min, Palm Jumeirah ~15 min, JBR ~19 min",
      "Dubai Hills Mall, 18-hole championship golf course, Dubai Hills Park",
      "Schools: GEMS International (0.9 km), GEMS Wellington Academy (1.1 km); 10 nearby schools rated Very Good or Outstanding"],
     ["Метро пока нет: нужен автомобиль",
      "На машине: Dubai Mall ~13 мин, аэропорт DXB ~18 мин, Палм ~15 мин, JBR ~19 мин",
      "Dubai Hills Mall, гольф-поле чемпионского уровня на 18 лунок, Dubai Hills Park",
      "Школы: GEMS International (0,9 км), GEMS Wellington Academy (1,1 км); рядом 10 школ с рейтингом Very Good или Outstanding"],
     PM, PMR, "DLD/Mollak 2026 median 18.53")
area("creek-harbour", "Dubai Creek Harbour", "Дубай Крик Харбор", 2325, 2470, [81000, 113112, 171731, 250246], 21, False,
     ["Blue Line metro station under construction, completion scheduled for 2029",
      "By car: Dubai Mall ~14 min, DXB airport ~17 min, Palm Jumeirah ~25 min",
      "Creek Beach, Creek Island Central Park, Ras Al Khor flamingo sanctuary 3 km, Festival City Mall 2.4 km",
      "Schools: Swiss International Scientific (2.2 km), Deira International (2.4 km, Outstanding)"],
     ["Станция синей ветки метро строится, открытие запланировано на 2029 год",
      "На машине: Dubai Mall ~14 мин, аэропорт DXB ~17 мин, Палм ~25 мин",
      "Пляж Creek Beach, парк Creek Island, заповедник фламинго Рас-аль-Хор в 3 км, Festival City Mall в 2,4 км",
      "Школы: Swiss International Scientific (2,2 км), Deira International (2,4 км, Outstanding)"],
     PM, PMR, "DLD/Mollak 2026 median 20.67", rent_est=[0])
area("sobha-hartland", "Sobha Hartland", "Собха Хартленд", 2093, 2052, [73000, 96914, 146294, 202729], 18, False,
     ["Green community in Mohammed Bin Rashid City", "Several international schools", "Short drive to Downtown"],
     ["Зелёный район в Mohammed Bin Rashid City", "Несколько международных школ", "Недалеко от Даунтауна"],
     PM, PMR, "DLD/Mollak 2026 median 17.36")
area("mbr-city", "Mohammed Bin Rashid City (MBR) / Meydan", "Mohammed Bin Rashid City (MBR) / Мейдан", 1955, 2024, [57644, 87869, 139980, 185697], 16, False,
     ["Large master plan next to Meydan and Ras Al Khor", "Crystal Lagoon projects", "Car-dependent: no metro station"],
     ["Большой мастер-план рядом с Мейданом", "Проекты с кристальной лагуной", "Нужен автомобиль: метро нет"],
     PM, PMR, "2026 guides range 12–20; est.")
area("town-square", "Town Square", "Таун Сквер", 1292, 1379, [48540, 69672, 97549, 129187], 15.4, False,
     ["Nshama community off Al Qudra Road", "Parks and community retail", "Car-dependent: no metro station"],
     ["Район Nshama у Al Qudra Road", "Парки и торговля в районе", "Нужен автомобиль: метро нет"],
     PM, PMR, "DLD/Mollak 2026 median 15.42")
area("the-cities", "Motor City / Sports City / Studio City", "Motor City / Sports City / Studio City", 835, 1044, [51076, 68723, 103469, 133871], 15.7, False,
     ["Established Dubailand communities", "High gross yields on entry-level stock", "Car-dependent: no metro station"],
     ["Устоявшиеся районы Dubailand", "Высокая валовая доходность у недорогих объектов", "Нужен автомобиль: метро нет"],
     PM, PMR, "Sports City DLD/Mollak 2026 median 15.75")
area("dubai-south", "Dubai South", "Дубай Саут", 1039, 1062, [44078, 58823, 77395, 111667], 17.2, False,
     ["Next to Al Maktoum airport and Expo City", "Lowest entry prices among new communities", "Car-dependent: no metro station in the residential district"],
     ["Рядом аэропорт Аль-Мактум и Expo City", "Один из самых низких порогов входа", "Нужен автомобиль: в жилой части метро нет"],
     PM, PMR, "DLD/Mollak 2026 median 17.13")
area("damac-hills", "DAMAC Hills", "ДАМАК Хиллс", 1273, 1385, [49369, 74078, 122237, 158000], 14, False,
     ["Golf community on Al Qudra Road", "Mix of apartments, townhouses and villas", "Car-dependent: no metro station"],
     ["Гольф-район у Al Qudra Road", "Квартиры, таунхаусы и виллы", "Нужен автомобиль: метро нет"],
     PM, PMR, "est.")
area("emaar-south", "Emaar South", "Эмаар Саут", 1123, 1230, [50000, 69400, 86749, 110896], 12, False,
     ["Emaar community in Dubai South with a golf course", "Close to Al Maktoum airport", "Car-dependent: no metro station"],
     ["Район Emaar в Дубай Саут с гольф-полем", "Рядом аэропорт Аль-Мактум", "Нужен автомобиль: метро нет"],
     PM, PMR, "est.", rent_est=[0])
area("dso", "Dubai Silicon Oasis (DSO)", "Дубай Силикон Оазис (DSO)", None, 1086, [45500, 63400, 90000, 115000], 12, False,
     ["Tech free zone with residential towers", "Among the highest gross yields in Dubai", "Blue Line metro planned, not yet open"],
     ["Технологическая свободная зона с жилыми башнями", "Одна из самых высоких валовых доходностей", "Синяя ветка метро планируется, пока не открыта"],
     "Bayut H1 2026 (asking)", "Bayut Q3 2026 (asking): studio, 1BR", "est.", rent_est=[2, 3])
area("international-city", "International City", "Интернешнл Сити", None, 1055, [41000, 61000, 82000, 100000], 8, False,
     ["Lowest entry prices in Dubai", "Very high gross yields", "Blue Line metro planned, not yet open"],
     ["Самый низкий порог входа в Дубае", "Очень высокая валовая доходность", "Синяя ветка метро планируется, пока не открыта"],
     "Bayut price index Aug 2026 (asking)", "Bayut H1 2026 (asking)", "est. (guides 6–8)", rent_est=[3],
     psf_note="Bayut index shows +30% over 12 months")

def change(a):
    return None if not a["psf_prev"] else (a["psf"] / a["psf_prev"] - 1) * 100

def growth(a):
    c = change(a)
    if c is None:
        return 2.0
    g = max(GROWTH_MIN, min(GROWTH_MAX, c))
    return round(g * 2) / 2

def sql_str(s): return "'" + s.replace("'", "''") + "'"
def sql_arr(xs): return "array[" + ",".join(sql_str(x) for x in xs) + "]"

def write_sql(path):
    L = ["-- Generated by scripts/build_area_data.py — do not edit by hand; edit the script and re-run.",
         "-- Apartments. Prices and rents: see source column per area.",
         "alter table public.areas add column if not exists price_change_pct numeric;", ""]
    L.append("insert into public.areas (id, name_en, name_ru, highlights_en, highlights_ru, has_metro, price_psf, service_charge_psf, growth_pct, price_change_pct, source, updated_at) values")
    rows = []
    for a in A:
        c = change(a)
        src = f"Prices: {a['src_price']}; rents: {a['src_rent']}; service charge: {a['src_sc']}"
        rows.append(f"  ({sql_str(a['id'])}, {sql_str(a['name_en'])}, {sql_str(a['name_ru'])}, {sql_arr(a['hl_en'])}, {sql_arr(a['hl_ru'])}, "
                    f"{'true' if a['metro'] else 'false'}, {a['psf']}, {a['sc']}, {growth(a)}, {'null' if c is None else round(c, 1)}, {sql_str(src)}, '2026-11-02')")
    L.append(",\n".join(rows))
    L.append("on conflict (id) do update set name_en = excluded.name_en, name_ru = excluded.name_ru, highlights_en = excluded.highlights_en,\n"
             "  highlights_ru = excluded.highlights_ru, has_metro = excluded.has_metro, price_psf = excluded.price_psf,\n"
             "  service_charge_psf = excluded.service_charge_psf, growth_pct = excluded.growth_pct, price_change_pct = excluded.price_change_pct,\n"
             "  source = excluded.source, updated_at = excluded.updated_at;\n")
    L.append("insert into public.area_rents (area_id, bedrooms, annual_rent) values")
    rr = []
    for a in A:
        for b, r in enumerate(a["rents"]):
            rr.append(f"  ({sql_str(a['id'])}, {b}, {r})")
    L.append(",\n".join(rr))
    L.append("on conflict (area_id, bedrooms) do update set annual_rent = excluded.annual_rent;\n")
    open(path, "w").write("\n".join(L))

def write_xlsx(path):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.comments import Comment
    wb = Workbook()
    F = "Arial"
    hdr = Font(name=F, bold=True, color="FFFFFF"); hfill = PatternFill("solid", fgColor="0E5A5F")
    inp = Font(name=F, color="0000FF"); est = PatternFill("solid", fgColor="FFF2CC"); base = Font(name=F)

    # ---- Assumptions
    ws0 = wb.active; ws0.title = "Assumptions"
    ws0["A1"] = "Default growth = observed price change, clamped to this band"; ws0["A1"].font = Font(name=F, bold=True)
    ws0["A2"], ws0["B2"] = "Growth floor", GROWTH_MIN / 100
    ws0["A3"], ws0["B3"] = "Growth cap", GROWTH_MAX / 100
    ws0["A4"], ws0["B4"] = "Default when no history", 0.02
    for c in ("B2", "B3", "B4"):
        ws0[c].font = inp; ws0[c].number_format = "0.0%"; ws0[c].fill = PatternFill("solid", fgColor="FFFF00")
    ws0["A6"] = "Blue = source data. Yellow fill on Areas/Rents = estimate, verify. Black = formula."
    ws0["A7"] = "Rents in the app are DLD-registered (new leases and renewals), so they run below portal asking rents."
    ws0["A8"] = "Market note: Q3 2026 citywide prices were down 1.7% year on year (Property Monitor, Aug 2026). Defaults are capped for that reason."
    for r in range(2, 9): ws0[f"A{r}"].font = base
    ws0.column_dimensions["A"].width = 60; ws0.column_dimensions["B"].width = 12

    # ---- Areas
    ws = wb.create_sheet("Areas")
    cols = ["ID", "Area (EN)", "Район (RU)", "Price AED/sqft 2025", "Price AED/sqft 2026", "Change", "Default growth",
            "Service charge AED/sqft", "Metro", "1BR rent AED", "1BR gross yield (750 sqft)", "Price source", "Rent source", "Service charge source", "Notes"]
    ws.append(cols)
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=1, column=i); cell.font = hdr; cell.fill = hfill; cell.alignment = Alignment(wrap_text=True, vertical="center")
    for r, a in enumerate(A, start=2):
        ws.cell(row=r, column=1, value=a["id"]).font = base
        ws.cell(row=r, column=2, value=a["name_en"]).font = base
        ws.cell(row=r, column=3, value=a["name_ru"]).font = base
        c4 = ws.cell(row=r, column=4, value=a["psf_prev"]); c4.font = inp; c4.number_format = "#,##0"
        c5 = ws.cell(row=r, column=5, value=a["psf"]); c5.font = inp; c5.number_format = "#,##0"
        ws.cell(row=r, column=6, value=f'=IF(D{r}="","",E{r}/D{r}-1)').number_format = "0.0%;-0.0%;-"
        ws.cell(row=r, column=7, value=f'=IF(F{r}="",Assumptions!$B$4,ROUND(MAX(Assumptions!$B$2,MIN(Assumptions!$B$3,F{r}))*200,0)/200)').number_format = "0.0%"
        c8 = ws.cell(row=r, column=8, value=a["sc"]); c8.font = inp; c8.number_format = "0.0"
        if "est" in a["src_sc"]: c8.fill = est
        ws.cell(row=r, column=9, value="Yes" if a["metro"] else "No").font = base
        ws.cell(row=r, column=10, value=f"=Rents!D{r}").font = Font(name=F, color="008000")
        ws.cell(row=r, column=10).number_format = "#,##0"
        ws.cell(row=r, column=11, value=f"=IF(E{r}=0,\"\",(J{r}-H{r}*750)/(E{r}*750))").number_format = "0.0%"
        ws.cell(row=r, column=12, value=a["src_price"]).font = base
        ws.cell(row=r, column=13, value=a["src_rent"]).font = base
        ws.cell(row=r, column=14, value=a["src_sc"]).font = base
        ws.cell(row=r, column=15, value=a["psf_note"]).font = base
        for col in (6, 7, 11): ws.cell(row=r, column=col).font = base
    ws.cell(row=1, column=11).comment = Comment("Net of service charge only, for a 750 sq ft unit: (1BR rent − SC × 750) / (price/sqft × 750).", "Yield Desk")
    widths = [18, 34, 34, 12, 12, 9, 10, 12, 7, 11, 12, 34, 34, 30, 30]
    for i, w in enumerate(widths, 1): ws.column_dimensions[chr(64 + i)].width = w
    ws.freeze_panes = "C2"; ws.row_dimensions[1].height = 42

    # ---- Rents
    wr = wb.create_sheet("Rents")
    rc = ["ID", "Area", "Studio", "1BR", "2BR", "3BR", "Source"]
    wr.append(rc)
    for i, c in enumerate(rc, 1):
        cell = wr.cell(row=1, column=i); cell.font = hdr; cell.fill = hfill
    order = [0, 1, 2, 3]  # columns C..F = Studio, 1BR, 2BR, 3BR (rows align with Areas)
    for r, a in enumerate(A, start=2):
        wr.cell(row=r, column=1, value=a["id"]).font = base
        wr.cell(row=r, column=2, value=a["name_en"]).font = base
        for j, b in enumerate(order):
            c = wr.cell(row=r, column=3 + j, value=a["rents"][b]); c.font = inp; c.number_format = "#,##0"
            if b in a["rent_est"]: c.fill = est
        wr.cell(row=r, column=7, value=a["src_rent"]).font = base
    for i, w in enumerate([18, 34, 11, 11, 11, 11, 44], 1): wr.column_dimensions[chr(64 + i)].width = w
    wr.freeze_panes = "C2"

    # ---- Sources
    wsrc = wb.create_sheet("Sources")
    wsrc.append(["Code", "Source", "Link", "What it covers"])
    for i in range(1, 5):
        wsrc.cell(row=1, column=i).font = hdr; wsrc.cell(row=1, column=i).fill = hfill
    for row in [
        ["PM", "Property Monitor via White & Co. market report, data to 2 Apr 2026", "https://whiteandcogroup.com/wp-content/uploads/2026/05/Downtown-2.pdf", "DLD-registered secondary sale prices per sq ft 2024–2026, rents by bedroom, 22 communities"],
        ["BAY-R", "Bayut Dubai Rental Market Report H1 2026", "https://www.bayut.com/mybayut/dubai-rental-market-report-h1-2026/", "Asking rents by bedroom; DSO / International City rents"],
        ["BAY-S", "Bayut Dubai Sales Market Report H1 2026", "https://www.bayut.com/mybayut/dubai-sales-market-report-h1-2026/", "Asking price per sq ft, gross yields; DSO price"],
        ["BAY-Q3", "Bayut Q3 2026 report (press coverage)", "https://mena.entrepreneur.com/business-news/dubai-property-prices-hold-steady-across-key-segments-in-q3-2026-bayut-data-shows", "DSO studio and 1BR asking rents, Q3 asking prices"],
        ["BAY-IDX", "Bayut price index, International City apartments", "https://www.bayut.com/property-market-analysis/index/sale/apartments/dubai/international-city/", "Price per sq ft Aug 2026"],
        ["SC", "DLD / Mollak service charge index, 2026 community medians (via market guides)", "https://dubailand.gov.ae", "Service charges; check the exact building in the DLD index"],
    ]:
        wsrc.append(row)
        for c in wsrc[wsrc.max_row]: c.font = base
    for i, w in enumerate([10, 60, 70, 70], 1): wsrc.column_dimensions[chr(64 + i)].width = w

    wb.save(path)

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(os.path.join(root, "data"), exist_ok=True)
    write_sql(os.path.join(root, "supabase", "seed_areas.sql"))
    write_xlsx(os.path.join(root, "data", "yield-desk-area-data.xlsx"))
    for a in A:
        c = change(a)
        print(f"{a['id']:20} psf {a['psf']:>5}  change {'' if c is None else f'{c:+.1f}%':>7}  growth {growth(a):+.1f}%  1BR {a['rents'][1]:>7}  SC {a['sc']}")
