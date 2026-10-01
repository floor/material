// scripts/generate-material-shapes.kt
//
// Writes test/fixtures/material-shapes.json: the 35 Material 3 Expressive
// shapes as Compose Material 3 itself builds them, the independent reference
// test/core/material-shapes.test.ts holds src/core/shapes/material.ts to
// (FLO-346). Not part of CI: run it when the port follows a newer Compose, and
// commit the fixture.
//
// The `Shapes` object below is Compose's MaterialShapes builders, copied
// verbatim from androidx at 080d2b3e5326ba80392d93442c4a51a02dc22650
// (compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/
// MaterialShapes.kt, Apache License 2.0, Copyright The Android Open Source
// Project). Only the Compose types they use are shimmed: Offset, a Matrix with
// the single scale or rotateZ the builders apply, fastMap, and Compose's
// internal RoundedPolygon.transformed(Matrix), here graphics-shapes'
// transformed { x, y -> }.
//
// Requirements, outside the repository: a JDK (17 tested), the Kotlin compiler
// 2.0.21 (github.com/JetBrains/kotlin/releases), and from Google's and Maven
// Central's repositories:
//   androidx.graphics:graphics-shapes-desktop:1.0.1   (what Compose Material 3 depends on)
//   androidx.collection:collection-jvm:1.5.0
//   androidx.annotation:annotation-jvm:1.9.1
//   org.jetbrains.kotlin:kotlin-stdlib:2.0.21
//
//   CP=graphics-shapes-desktop-1.0.1.jar:kotlin-stdlib-2.0.21.jar:collection-jvm-1.5.0.jar:annotation-jvm-1.9.1.jar
//   kotlinc scripts/generate-material-shapes.kt -cp $CP -d gen.jar
//   java -cp gen.jar:$CP Generate_material_shapesKt > test/fixtures/material-shapes.json
//
// When Compose changes MaterialShapes, update the revision here and in the
// output, copy the builders again, and regenerate.

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.TransformResult
import androidx.graphics.shapes.circle
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.star
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

// --- shims for the Compose types the builders use ---
data class Offset(val x: Float, val y: Float) {
    operator fun minus(o: Offset) = Offset(x - o.x, y - o.y)
    operator fun plus(o: Offset) = Offset(x + o.x, y + o.y)
    operator fun times(f: Float) = Offset(x * f, y * f)
    fun getDistance() = sqrt(x * x + y * y)
    companion object { val Zero = Offset(0f, 0f) }
}
// compose.ui.graphics.Matrix, for the single scale / rotateZ the builders apply
class Matrix {
    var a = 1f; var b = 0f; var c = 0f; var d = 1f
    fun scale(x: Float = 1f, y: Float = 1f) { a *= x; c *= x; b *= y; d *= y }
    fun rotateZ(degrees: Float) {
        val r = degrees * PI.toFloat() / 180f; val s = sin(r); val co = cos(r)
        val na = a * co + c * s; val nb = b * co + d * s; val nc = -a * s + c * co; val nd = -b * s + d * co
        a = na; b = nb; c = nc; d = nd
    }
    // x' = a x + c y, y' = b x + d y (column-major, as compose Matrix.map)
    fun map(x: Float, y: Float) = TransformResult(a * x + c * y, b * x + d * y)
}
fun RoundedPolygon.transformed(m: Matrix): RoundedPolygon = transformed { x, y -> m.map(x, y) }
inline fun <T, R> List<T>.fastMap(f: (T) -> R): List<R> = map(f)

object Shapes {
        val cornerRound15 = CornerRounding(radius = .15f)
        val cornerRound20 = CornerRounding(radius = .2f)
        val cornerRound30 = CornerRounding(radius = .3f)
        val cornerRound50 = CornerRounding(radius = .5f)
        val cornerRound100 = CornerRounding(radius = 1f)

        val rotateNeg45 = Matrix().apply { rotateZ(-45f) }
        val rotateNeg90 = Matrix().apply { rotateZ(-90f) }
        val rotateNeg135 = Matrix().apply { rotateZ(-135f) }
        fun circle(numVertices: Int = 10): RoundedPolygon {
            return RoundedPolygon.circle(numVertices = numVertices)
        }

        fun square(): RoundedPolygon {
            return RoundedPolygon.rectangle(width = 1f, height = 1f, rounding = cornerRound30)
        }

        fun slanted(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.926f, 0.970f), CornerRounding(0.189f, 0.811f)),
                    PointNRound(Offset(-0.021f, 0.967f), CornerRounding(0.187f, 0.057f)),
                ),
                2,
            )
        }

        fun arch(): RoundedPolygon {
            return RoundedPolygon(
                    numVertices = 4,
                    perVertexRounding =
                        listOf(cornerRound100, cornerRound100, cornerRound20, cornerRound20),
                )
                .transformed(rotateNeg135)
        }

        fun fan(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(1.004f, 1.000f), CornerRounding(0.148f, 0.417f)),
                    PointNRound(Offset(0.000f, 1.000f), CornerRounding(0.151f)),
                    PointNRound(Offset(0.000f, -0.003f), CornerRounding(0.148f)),
                    PointNRound(Offset(0.978f, 0.020f), CornerRounding(0.803f)),
                ),
                1,
            )
        }

        fun arrow(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0.892f), CornerRounding(0.313f)),
                    PointNRound(Offset(-0.216f, 1.050f), CornerRounding(0.207f)),
                    PointNRound(Offset(0.499f, -0.160f), CornerRounding(0.215f, 1.000f)),
                    PointNRound(Offset(1.225f, 1.060f), CornerRounding(0.211f)),
                ),
                1,
            )
        }

        fun semiCircle(): RoundedPolygon {
            return RoundedPolygon.rectangle(
                width = 1.6f,
                height = 1f,
                perVertexRounding =
                    listOf(cornerRound20, cornerRound20, cornerRound100, cornerRound100),
            )
        }

        fun oval(): RoundedPolygon {
            val m = Matrix().apply { scale(1f, 0.64f) }
            return RoundedPolygon.circle().transformed(m).transformed(rotateNeg45)
        }

        fun pill(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.961f, 0.039f), CornerRounding(0.426f)),
                    PointNRound(Offset(1.001f, 0.428f)),
                    PointNRound(Offset(1.000f, 0.609f), CornerRounding(1.000f)),
                ),
                reps = 2,
                mirroring = true,
            )
        }

        fun triangle(): RoundedPolygon {
            return RoundedPolygon(numVertices = 3, rounding = cornerRound20)
                .transformed(rotateNeg90)
        }

        fun diamond(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 1.096f), CornerRounding(0.151f, 0.524f)),
                    PointNRound(Offset(0.040f, 0.500f), CornerRounding(0.159f)),
                ),
                2,
            )
        }

        fun clamShell(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.171f, 0.841f), CornerRounding(0.159f)),
                    PointNRound(Offset(-0.020f, 0.500f), CornerRounding(0.140f)),
                    PointNRound(Offset(0.170f, 0.159f), CornerRounding(0.159f)),
                ),
                2,
            )
        }

        fun pentagon(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, -0.009f), CornerRounding(0.172f)),
                    PointNRound(Offset(1.030f, 0.365f), CornerRounding(0.164f)),
                    PointNRound(Offset(0.828f, 0.970f), CornerRounding(0.169f)),
                ),
                reps = 1,
                mirroring = true,
            )
        }

        fun gem(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.499f, 1.023f), CornerRounding(0.241f, 0.778f)),
                    PointNRound(Offset(-0.005f, 0.792f), CornerRounding(0.208f)),
                    PointNRound(Offset(0.073f, 0.258f), CornerRounding(0.228f)),
                    PointNRound(Offset(0.433f, -0.000f), CornerRounding(0.491f)),
                ),
                1,
                mirroring = true,
            )
        }

        fun sunny(): RoundedPolygon {
            return RoundedPolygon.star(
                numVerticesPerRadius = 8,
                innerRadius = .8f,
                rounding = cornerRound15,
            )
        }

        fun verySunny(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 1.080f), CornerRounding(0.085f)),
                    PointNRound(Offset(0.358f, 0.843f), CornerRounding(0.085f)),
                ),
                8,
            )
        }

        fun cookie4(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(1.237f, 1.236f), CornerRounding(0.258f)),
                    PointNRound(Offset(0.500f, 0.918f), CornerRounding(0.233f)),
                ),
                4,
            )
        }

        fun cookie6(): RoundedPolygon {
            // 6-point cookie
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.723f, 0.884f), CornerRounding(0.394f)),
                    PointNRound(Offset(0.500f, 1.099f), CornerRounding(0.398f)),
                ),
                6,
            )
        }

        fun cookie7(): RoundedPolygon {
            // 7-point cookie
            return RoundedPolygon.star(
                    numVerticesPerRadius = 7,
                    innerRadius = .75f,
                    rounding = cornerRound50,
                )
                .transformed(rotateNeg90)
        }

        fun cookie9(): RoundedPolygon {
            return RoundedPolygon.star(
                    numVerticesPerRadius = 9,
                    innerRadius = .8f,
                    rounding = cornerRound50,
                )
                .transformed(rotateNeg90)
        }

        fun cookie12(): RoundedPolygon {
            return RoundedPolygon.star(
                    numVerticesPerRadius = 12,
                    innerRadius = .8f,
                    rounding = cornerRound50,
                )
                .transformed(rotateNeg90)
        }

        fun ghostish(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0f), CornerRounding(1.000f)),
                    PointNRound(Offset(1f, 0f), CornerRounding(1.000f)),
                    PointNRound(Offset(1f, 1.140f), CornerRounding(0.254f, 0.106f)),
                    PointNRound(Offset(0.575f, 0.906f), CornerRounding(0.253f)),
                ),
                reps = 1,
                mirroring = true,
            )
        }

        fun clover4(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0.074f)),
                    PointNRound(Offset(0.725f, -0.099f), CornerRounding(0.476f)),
                ),
                reps = 4,
                mirroring = true,
            )
        }

        fun clover8(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0.036f)),
                    PointNRound(Offset(0.758f, -0.101f), CornerRounding(0.209f)),
                ),
                reps = 8,
            )
        }

        fun burst(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, -0.006f), CornerRounding(0.006f)),
                    PointNRound(Offset(0.592f, 0.158f), CornerRounding(0.006f)),
                ),
                reps = 12,
            )
        }

        fun softBurst(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.193f, 0.277f), CornerRounding(0.053f)),
                    PointNRound(Offset(0.176f, 0.055f), CornerRounding(0.053f)),
                ),
                reps = 10,
            )
        }

        fun boom(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.457f, 0.296f), CornerRounding(0.007f)),
                    PointNRound(Offset(0.500f, -0.051f), CornerRounding(0.007f)),
                ),
                reps = 15,
            )
        }

        fun softBoom(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.733f, 0.454f)),
                    PointNRound(Offset(0.839f, 0.437f), CornerRounding(0.532f)),
                    PointNRound(Offset(0.949f, 0.449f), CornerRounding(0.439f, 1.000f)),
                    PointNRound(Offset(0.998f, 0.478f), CornerRounding(0.174f)),
                ),
                reps = 16,
                mirroring = true,
            )
        }

        fun flower(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.370f, 0.187f)),
                    PointNRound(Offset(0.416f, 0.049f), CornerRounding(0.381f)),
                    PointNRound(Offset(0.479f, 0.001f), CornerRounding(0.095f)),
                ),
                reps = 8,
                mirroring = true,
            )
        }

        fun puffy(): RoundedPolygon {
            val m = Matrix().apply { scale(1f, 0.742f) }
            return customPolygon(
                    listOf(
                        PointNRound(Offset(0.500f, 0.053f)),
                        PointNRound(Offset(0.545f, -0.040f), CornerRounding(0.405f)),
                        PointNRound(Offset(0.670f, -0.035f), CornerRounding(0.426f)),
                        PointNRound(Offset(0.717f, 0.066f), CornerRounding(0.574f)),
                        PointNRound(Offset(0.722f, 0.128f)),
                        PointNRound(Offset(0.777f, 0.002f), CornerRounding(0.360f)),
                        PointNRound(Offset(0.914f, 0.149f), CornerRounding(0.660f)),
                        PointNRound(Offset(0.926f, 0.289f), CornerRounding(0.660f)),
                        PointNRound(Offset(0.881f, 0.346f)),
                        PointNRound(Offset(0.940f, 0.344f), CornerRounding(0.126f)),
                        PointNRound(Offset(1.003f, 0.437f), CornerRounding(0.255f)),
                    ),
                    reps = 2,
                    mirroring = true,
                )
                .transformed(m)
        }

        fun puffyDiamond(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.870f, 0.130f), CornerRounding(0.146f)),
                    PointNRound(Offset(0.818f, 0.357f)),
                    PointNRound(Offset(1.000f, 0.332f), CornerRounding(0.853f)),
                ),
                reps = 4,
                mirroring = true,
            )
        }

        @Suppress("ListIterator", "PrimitiveInCollection")
        fun pixelCircle(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0.000f)),
                    PointNRound(Offset(0.704f, 0.000f)),
                    PointNRound(Offset(0.704f, 0.065f)),
                    PointNRound(Offset(0.843f, 0.065f)),
                    PointNRound(Offset(0.843f, 0.148f)),
                    PointNRound(Offset(0.926f, 0.148f)),
                    PointNRound(Offset(0.926f, 0.296f)),
                    PointNRound(Offset(1.000f, 0.296f)),
                ),
                reps = 2,
                mirroring = true,
            )
        }

        @Suppress("ListIterator", "PrimitiveInCollection")
        fun pixelTriangle(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.110f, 0.500f)),
                    PointNRound(Offset(0.113f, 0.000f)),
                    PointNRound(Offset(0.287f, 0.000f)),
                    PointNRound(Offset(0.287f, 0.087f)),
                    PointNRound(Offset(0.421f, 0.087f)),
                    PointNRound(Offset(0.421f, 0.170f)),
                    PointNRound(Offset(0.560f, 0.170f)),
                    PointNRound(Offset(0.560f, 0.265f)),
                    PointNRound(Offset(0.674f, 0.265f)),
                    PointNRound(Offset(0.675f, 0.344f)),
                    PointNRound(Offset(0.789f, 0.344f)),
                    PointNRound(Offset(0.789f, 0.439f)),
                    PointNRound(Offset(0.888f, 0.439f)),
                ),
                reps = 1,
                mirroring = true,
            )
        }

        fun bun(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.796f, 0.500f)),
                    PointNRound(Offset(0.853f, 0.518f), CornerRounding(1f)),
                    PointNRound(Offset(0.992f, 0.631f), CornerRounding(1f)),
                    PointNRound(Offset(0.968f, 1.000f), CornerRounding(1f)),
                ),
                reps = 2,
                mirroring = true,
            )
        }

        fun heart(): RoundedPolygon {
            return customPolygon(
                listOf(
                    PointNRound(Offset(0.500f, 0.268f), CornerRounding(0.016f)),
                    PointNRound(Offset(0.792f, -0.066f), CornerRounding(0.958f)),
                    PointNRound(Offset(1.064f, 0.276f), CornerRounding(1.000f)),
                    PointNRound(Offset(0.501f, 0.946f), CornerRounding(0.129f)),
                ),
                reps = 1,
                mirroring = true,
            )
        }

        data class PointNRound(
            val o: Offset,
            val r: CornerRounding = CornerRounding.Unrounded,
        )

        @Suppress("PrimitiveInCollection")
        fun doRepeat(
            points: List<PointNRound>,
            reps: Int,
            center: Offset,
            mirroring: Boolean,
        ) =
            if (mirroring) {
                buildList {
                    val angles = points.fastMap { (it.o - center).angleDegrees() }
                    val distances = points.fastMap { (it.o - center).getDistance() }
                    val actualReps = reps * 2
                    val sectionAngle = 360f / actualReps
                    repeat(actualReps) {
                        points.indices.forEach { index ->
                            val i = if (it % 2 == 0) index else points.lastIndex - index
                            if (i > 0 || it % 2 == 0) {
                                val a =
                                    (sectionAngle * it +
                                            if (it % 2 == 0) angles[i]
                                            else sectionAngle - angles[i] + 2 * angles[0])
                                        .toRadians()
                                val finalPoint = Offset(cos(a), sin(a)) * distances[i] + center
                                add(PointNRound(finalPoint, points[i].r))
                            }
                        }
                    }
                }
            } else {
                points.size.let { np ->
                    (0 until np * reps).map {
                        val point = points[it % np].o.rotateDegrees((it / np) * 360f / reps, center)
                        PointNRound(point, points[it % np].r)
                    }
                }
            }

        fun Offset.rotateDegrees(angle: Float, center: Offset = Offset.Zero) =
            (angle.toRadians()).let { a ->
                val off = this - center
                Offset(off.x * cos(a) - off.y * sin(a), off.x * sin(a) + off.y * cos(a)) + center
            }

        fun Float.toRadians(): Float {
            return this / 360f * 2 * PI.toFloat()
        }

        fun Offset.angleDegrees() = atan2(y, x) * 180f / PI.toFloat()

        fun customPolygon(
            pnr: List<PointNRound>,
            reps: Int,
            center: Offset = Offset(0.5f, 0.5f),
            mirroring: Boolean = false,
        ): RoundedPolygon {
            val actualPoints = doRepeat(pnr, reps, center, mirroring)
            return RoundedPolygon(
                vertices =
                    FloatArray(actualPoints.size * 2) { ix ->
                        actualPoints[ix / 2].o.let { if (ix % 2 == 0) it.x else it.y }
                    },
                perVertexRounding = buildList { for (p in actualPoints) add(p.r) },
                centerX = center.x,
                centerY = center.y,
            )
        }
}

fun main() {
    val names = listOf("Circle" to { Shapes.circle() }, "Square" to { Shapes.square() }, "Slanted" to { Shapes.slanted() }, "Arch" to { Shapes.arch() }, "Fan" to { Shapes.fan() }, "Arrow" to { Shapes.arrow() }, "SemiCircle" to { Shapes.semiCircle() }, "Oval" to { Shapes.oval() }, "Pill" to { Shapes.pill() }, "Triangle" to { Shapes.triangle() }, "Diamond" to { Shapes.diamond() }, "ClamShell" to { Shapes.clamShell() }, "Pentagon" to { Shapes.pentagon() }, "Gem" to { Shapes.gem() }, "Sunny" to { Shapes.sunny() }, "VerySunny" to { Shapes.verySunny() }, "Cookie4Sided" to { Shapes.cookie4() }, "Cookie6Sided" to { Shapes.cookie6() }, "Cookie7Sided" to { Shapes.cookie7() }, "Cookie9Sided" to { Shapes.cookie9() }, "Cookie12Sided" to { Shapes.cookie12() }, "Ghostish" to { Shapes.ghostish() }, "Clover4Leaf" to { Shapes.clover4() }, "Clover8Leaf" to { Shapes.clover8() }, "Burst" to { Shapes.burst() }, "SoftBurst" to { Shapes.softBurst() }, "Boom" to { Shapes.boom() }, "SoftBoom" to { Shapes.softBoom() }, "Flower" to { Shapes.flower() }, "Puffy" to { Shapes.puffy() }, "PuffyDiamond" to { Shapes.puffyDiamond() }, "PixelCircle" to { Shapes.pixelCircle() }, "PixelTriangle" to { Shapes.pixelTriangle() }, "Bun" to { Shapes.bun() }, "Heart" to { Shapes.heart() })
    val sb = StringBuilder()
    sb.append("{\"source\":{\"androidx\":\"080d2b3e5326ba80392d93442c4a51a02dc22650\",\"file\":\"compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt\",\"graphicsShapes\":\"androidx.graphics:graphics-shapes-desktop:1.0.1\"},\"shapes\":{")
    names.forEachIndexed { i, (name, build) ->
        val p = build().normalized()
        if (i > 0) sb.append(",")
        sb.append("\"").append(name.replaceFirstChar { it.lowercase() }).append("\":[")
        p.cubics.forEachIndexed { j, cubic ->
            if (j > 0) sb.append(",")
            sb.append("[").append(floatArrayOf(cubic.anchor0X, cubic.anchor0Y, cubic.control0X, cubic.control0Y, cubic.control1X, cubic.control1Y, cubic.anchor1X, cubic.anchor1Y).joinToString(",") { "%.5f".format(java.util.Locale.ROOT, it) }).append("]")
        }
        sb.append("]")
    }
    sb.append("}}")
    println(sb)
}
